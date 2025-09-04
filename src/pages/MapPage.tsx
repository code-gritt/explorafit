import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { RootState } from "@/store";
import { setAuth } from "@/store/authSlice";
import L from "leaflet";

// Fix Leaflet default icon paths for Vite
const icon = L.icon({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export const defaultIcon = icon;

interface FormData {
  name: string;
  difficulty: "Easy" | "Moderate" | "Hard";
  description: string;
  landmarks: string;
  city: string;
}

function MapPage() {
  const { token, user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const [waypoints, setWaypoints] = useState<L.LatLng[]>([]);
  const [distance, setDistance] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!token || !user) {
      navigate("/login");
    }
  }, [token, user, navigate]);

  // Calculate distance
  useEffect(() => {
    if (waypoints.length < 2) {
      setDistance(0);
      return;
    }
    let total = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      total += waypoints[i].distanceTo(waypoints[i + 1]) / 1000; // km
    }
    setDistance(parseFloat(total.toFixed(2)));
  }, [waypoints]);

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
      const polylineJson = waypoints.map((wp) => ({
        lat: wp.lat,
        lng: wp.lng,
      }));

      const response = await fetch("https://explorafit-backend.onrender.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ?? "",
        },
        body: JSON.stringify({
          query: `
              mutation CreateRoute($name: String!, $difficulty: String!, $description: String, $landmarks: String, $distance: Float!, $city: String, $polyline: JSONB!) {
                createRoute(name: $name, difficulty: $difficulty, description: $description, landmarks: $landmarks, distance: $distance, city: $city, polyline: $polyline) {
                  route { id, name, difficulty, distance, city, created_at }
                  user { id, email, isPremium, credits }
                }
              }
            `,
          variables: {
            name: data.name,
            difficulty: data.difficulty,
            description: data.description || null,
            landmarks: data.landmarks || null,
            distance,
            city: data.city || null,
            polyline: polylineJson,
          },
        }),
      });

      const { data: responseData, errors } = await response.json();
      if (errors) throw new Error(errors[0].message);

      dispatch(
        setAuth({
          token: token ?? null,
          user: responseData.createRoute.user,
        })
      );

      navigate("/dashboard");
    } catch (e: any) {
      setError(e.message || "Failed to create route");
    } finally {
      setIsLoading(false);
    }
  };

  function MapClickHandler() {
    useMapEvents({
      click: (e) => {
        setWaypoints((prev) => [...prev, e.latlng]);
      },
    });
    return null;
  }

  const clearWaypoints = () => {
    setWaypoints([]);
    setDistance(0);
  };

  return (
    <div className="min-h-screen bg-primary-100 p-8">
      <div className="mx-auto flex max-w-6xl gap-8">
        {/* Map */}
        <div className="h-[600px] flex-1 overflow-hidden rounded-lg shadow-md">
          <MapContainer
            center={[51.505, -0.09]}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapClickHandler />
            <Polyline positions={waypoints} color="blue" />
            {waypoints.map((wp, idx) => (
              <Marker
                key={idx}
                position={wp}
                icon={defaultIcon}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const newWp = e.target.getLatLng();
                    setWaypoints((prev) => {
                      const newArr = [...prev];
                      newArr[idx] = newWp;
                      return newArr;
                    });
                  },
                }}
              />
            ))}
          </MapContainer>
        </div>

        {/* Form */}
        <div className="w-96 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-6 text-2xl font-bold text-primary-500">
            Create New Route
          </h2>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-4">
              <input
                {...register("name", { required: "Name is required" })}
                placeholder="Route Name"
                className="w-full rounded-md border border-gray-400 p-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {errors.name && (
                <span className="text-sm text-red-500">
                  {errors.name.message}
                </span>
              )}
            </div>
            <div className="mb-4">
              <select
                {...register("difficulty", {
                  required: "Difficulty is required",
                })}
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
            <div className="mb-4">
              <textarea
                {...register("description")}
                placeholder="Description"
                className="w-full rounded-md border border-gray-400 p-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="mb-4">
              <input
                {...register("landmarks")}
                placeholder="Landmarks"
                className="w-full rounded-md border border-gray-400 p-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="mb-4">
              <input
                {...register("city")}
                placeholder="City"
                className="w-full rounded-md border border-gray-400 p-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="mb-4 text-sm text-gray-400">
              Distance: {distance.toFixed(2)} km
              <br />
              Credits: {user?.credits ?? 0} (Costs {user?.isPremium ? 0 : 1}{" "}
              credit)
            </div>
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
