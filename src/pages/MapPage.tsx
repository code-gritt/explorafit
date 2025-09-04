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

  // Update distance when waypoints change
  useEffect(() => {
    let total = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      total += waypoints[i].distanceTo(waypoints[i + 1]) / 1000; // km
    }
    setDistance(total);
  }, [waypoints]);

  const onSubmit = async (data: FormData) => {
    if (waypoints.length < 2) {
      setError("Add at least two points to create a route");
      return;
    }

    if (!token) {
      setError("You must be logged in to create a route");
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
          Authorization: `${token}`,
        },
        body: JSON.stringify({
          query: `
            mutation {
              createRoute(
                name: "${data.name}", 
                difficulty: "${data.difficulty}", 
                description: "${data.description}", 
                landmarks: "${data.landmarks}", 
                distance: ${distance}, 
                city: "${data.city}", 
                polyline: ${JSON.stringify(polylineJson)}
              ) {
                route { id, name, difficulty, distance, city, created_at }
                user { id, email, isPremium, credits }
              }
            }
          `,
        }),
      });

      const { data: responseData, errors } = await response.json();
      if (errors) throw new Error(errors[0].message);

      // ✅ token is guaranteed here
      dispatch(
        setAuth({
          token,
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
      click: (e: { latlng: any }) => {
        setWaypoints([...waypoints, e.latlng]);
      },
    });
    return null;
  }

  return (
    <div className="flex min-h-screen bg-primary-100 p-8">
      <div className="mx-auto flex w-full max-w-6xl gap-8">
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
              <Marker key={idx} position={wp} />
            ))}
          </MapContainer>
        </div>

        {/* Form */}
        <div className="w-96 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-6 text-2xl font-bold text-primary-500">
            Create Route
          </h2>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-4">
              <input
                {...register("name", { required: "Name required" })}
                placeholder="Name"
                className="w-full rounded-md border border-gray-400 p-3"
              />
              {errors.name && (
                <span className="text-sm text-red-500">
                  {errors.name.message}
                </span>
              )}
            </div>
            <div className="mb-4">
              <select
                {...register("difficulty", { required: "Difficulty required" })}
                className="w-full rounded-md border border-gray-400 p-3"
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
                className="w-full rounded-md border border-gray-400 p-3"
              />
            </div>
            <div className="mb-4">
              <input
                {...register("landmarks")}
                placeholder="Landmarks"
                className="w-full rounded-md border border-gray-400 p-3"
              />
            </div>
            <div className="mb-4">
              <input
                {...register("city")}
                placeholder="City"
                className="w-full rounded-md border border-gray-400 p-3"
              />
            </div>
            <div className="mb-4 text-sm text-gray-400">
              Distance: {distance.toFixed(2)} km
              <br />
              Credits left: {user?.credits} (Costs 1 credit)
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full rounded-md p-3 text-white transition duration-300 ${
                isLoading
                  ? "bg-gray-400"
                  : "bg-secondary-500 hover:bg-primary-500"
              }`}
            >
              {isLoading ? "Creating..." : "Create Route"}
            </button>
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
