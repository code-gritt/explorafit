import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import { RootState } from "@/store";
import { setAuth } from "@/store/authSlice";
import Loader from "@/scenes/Loader";

const markerIcon = L.icon({
  iconUrl: "/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
  iconSize: [50, 50],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface FormData {
  name: string;
  difficulty: "Easy" | "Moderate" | "Hard";
  description: string;
  landmarks: string;
  city: string;
}

interface Route {
  id: string;
  name: string;
  difficulty: string;
  description: string | null;
  landmarks: string | null;
  distance: number;
  city: string | null;
  created_at: string;
  polyline: { lat: number; lng: number }[] | null;
}

/** Auto-fit map bounds to waypoints */
function FitBounds({ waypoints }: { waypoints: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (waypoints.length > 1) {
      map.fitBounds(waypoints);
    }
  }, [waypoints, map]);
  return null;
}

/** Handle map clicks */
function MapClickHandler({
  setWaypoints,
}: {
  setWaypoints: React.Dispatch<React.SetStateAction<[number, number][]>>;
}) {
  useMapEvents({
    click: (e) =>
      setWaypoints((prev) => [...prev, [e.latlng.lat, e.latlng.lng]]),
  });
  return null;
}

function MapPage() {
  const { token, user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const preloadedRoute = (location.state as { route?: Route })?.route;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>();

  const [waypoints, setWaypoints] = useState<[number, number][]>([]);
  const [distance, setDistance] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!token || !user) navigate("/login");
  }, [token, user, navigate]);

  // Preload route if passed from dashboard
  useEffect(() => {
    if (preloadedRoute) {
      reset({
        name: preloadedRoute.name,
        difficulty: preloadedRoute.difficulty as "Easy" | "Moderate" | "Hard",
        description: preloadedRoute.description ?? "",
        landmarks: preloadedRoute.landmarks ?? "",
        city: preloadedRoute.city ?? "",
      });

      if (preloadedRoute.polyline) {
        setWaypoints(
          preloadedRoute.polyline.map((p) => [p.lat, p.lng] as [number, number])
        );
      }
      setDistance(preloadedRoute.distance ?? 0);
    }
  }, [preloadedRoute, reset]);

  // Auto calculate distance whenever waypoints change
  useEffect(() => {
    if (waypoints.length < 2) {
      setDistance(0);
      return;
    }
    const total = waypoints.reduce(
      (acc, curr, idx) =>
        idx === 0
          ? 0
          : acc +
            L.latLng(waypoints[idx - 1]).distanceTo(L.latLng(curr)) / 1000,
      0
    );
    setDistance(parseFloat(total.toFixed(2)));
  }, [waypoints]);

  const clearWaypoints = () => {
    setWaypoints([]);
    setDistance(0);
  };

  const onSubmit = async (data: FormData) => {
    if (waypoints.length < 2) {
      setError("Add at least two points to create a route");
      return;
    }
    if (user && !user.isPremium && (user.credits ?? 0) <= 0) {
      setError("Insufficient credits to create a route");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const polyline = waypoints.map(([lat, lng]) => ({ lat, lng }));

      const response = await fetch("https://explorafit-backend.onrender.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ?? "",
        },
        body: JSON.stringify({
          query: `
            mutation CreateRoute(
              $name: String!, 
              $difficulty: String!, 
              $description: String, 
              $landmarks: String, 
              $distance: Float!, 
              $city: String, 
              $polyline: JSON!
            ) {
              createRoute(
                name: $name, 
                difficulty: $difficulty, 
                description: $description, 
                landmarks: $landmarks, 
                distance: $distance, 
                city: $city, 
                polyline: $polyline
              ) {
                route { id, name, difficulty, distance, city, created_at }
                user { id, email, isPremium, credits }
              }
            }
          `,
          variables: {
            ...data,
            distance,
            polyline,
            description: data.description || null,
            landmarks: data.landmarks || null,
            city: data.city || null,
          },
        }),
      });

      const { data: responseData, errors } = await response.json();
      if (errors) throw new Error(errors[0].message);

      dispatch(
        setAuth({ token: token ?? "", user: responseData.createRoute.user })
      );
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to create route");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-100 p-8">
      <Loader isLoading={isLoading} />

      <div className="mx-auto mt-16 flex max-w-6xl gap-8">
        {/* Map */}
        <div className="h-[600px] flex-1 overflow-hidden rounded-lg shadow-md">
          <MapContainer
            center={waypoints[0] || [51.505, -0.09]}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            {!preloadedRoute && <MapClickHandler setWaypoints={setWaypoints} />}
            {waypoints.length > 1 && (
              <Polyline
                positions={waypoints}
                pathOptions={{ color: "blue", weight: 5 }}
              />
            )}
            <FitBounds waypoints={waypoints} />
            {waypoints.map((wp, idx) => (
              <Marker
                key={idx}
                position={wp}
                icon={markerIcon}
                draggable={!preloadedRoute}
                eventHandlers={{
                  dragend: (e) =>
                    setWaypoints((prev) =>
                      prev.map((p, i) =>
                        i === idx
                          ? [e.target.getLatLng().lat, e.target.getLatLng().lng]
                          : p
                      )
                    ),
                }}
              />
            ))}
          </MapContainer>
        </div>

        {/* Form */}
        <div className="w-96 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-6 text-2xl font-bold text-primary-500">
            {preloadedRoute ? "View Route" : "Create New Route"}
          </h2>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Name */}
            <div className="mb-4">
              <input
                {...register("name", { required: "Name is required" })}
                placeholder="Route Name"
                disabled={!!preloadedRoute}
                className="w-full rounded-md border border-gray-400 p-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {errors.name && (
                <span className="text-sm text-red-500">
                  {errors.name.message}
                </span>
              )}
            </div>

            {/* Difficulty */}
            <div className="mb-4">
              <select
                {...register("difficulty", {
                  required: "Difficulty is required",
                })}
                disabled={!!preloadedRoute}
                className="w-full rounded-md border border-gray-400 p-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Difficulty</option>
                <option value="Easy">Easy</option>
                <option value="Moderate">Moderate</option>
                <option value="Hard">Hard</option>
              </select>
              {errors.difficulty && (
                <span className="text-sm text-red-500">
                  {errors.difficulty.message}
                </span>
              )}
            </div>

            {/* Description */}
            <div className="mb-4">
              <textarea
                {...register("description")}
                placeholder="Description"
                disabled={!!preloadedRoute}
                className="w-full rounded-md border border-gray-400 p-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Landmarks */}
            <div className="mb-4">
              <input
                {...register("landmarks")}
                placeholder="Landmarks"
                disabled={!!preloadedRoute}
                className="w-full rounded-md border border-gray-400 p-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* City */}
            <div className="mb-4">
              <input
                {...register("city")}
                placeholder="City"
                disabled={!!preloadedRoute}
                className="w-full rounded-md border border-gray-400 p-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Distance & Credits */}
            <div className="mb-4 text-sm text-gray-400">
              Distance: {distance.toFixed(2)} km <br />
              Credits: {user?.credits ?? 0} (Costs {user?.isPremium ? 0 : 1}{" "}
              credit)
            </div>

            {/* Buttons */}
            {!preloadedRoute && (
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`flex-1 rounded-md p-3 text-white transition duration-300 ${
                    isLoading
                      ? "cursor-not-allowed bg-gray-400"
                      : "bg-secondary-500 hover:bg-primary-500"
                  }`}
                >
                  {isLoading ? "Creating..." : "Create Route"}
                </button>
                <button
                  type="button"
                  onClick={clearWaypoints}
                  className="flex-1 rounded-md border border-primary-500 p-3 text-primary-500 transition duration-300 hover:bg-primary-100"
                >
                  Clear Points
                </button>
              </div>
            )}

            {error && (
              <span className="mt-4 block text-center text-sm text-red-500">
                {error}
              </span>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default MapPage;
