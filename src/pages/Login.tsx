import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setAuth } from "@/store/authSlice";
import { useState } from "react";
import Loader from "@/scenes/Loader";

interface FormData {
  email: string;
  password: string;
}

function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("https://explorafit-backend.onrender.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            mutation {
              login(email: "${data.email}", password: "${data.password}") {
                token
                user { id, email, isPremium, credits }
              }
            }
          `,
        }),
      });

      const { data: responseData, errors } = await response.json();
      if (errors) throw new Error(errors[0].message);

      dispatch(
        setAuth({
          token: responseData.login.token,
          user: responseData.login.user,
        })
      );

      navigate("/dashboard");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Loader overlay */}
      <Loader isLoading={isLoading} />

      {/* Login UI */}
      <div className="flex min-h-screen items-center justify-center bg-primary-100">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <h2 className="mb-6 text-center text-2xl font-bold text-primary-500">
            Login to Explorafit
          </h2>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-4">
              <input
                {...register("email", {
                  required: "Email is required",
                  pattern: { value: /^\S+@\S+$/i, message: "Invalid email" },
                })}
                placeholder="Email"
                className="w-full rounded-md border border-gray-400 p-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {errors.email && (
                <span className="text-sm text-red-500">
                  {errors.email.message}
                </span>
              )}
            </div>

            <div className="mb-6">
              <input
                type="password"
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 6,
                    message: "Password must be at least 6 characters",
                  },
                })}
                placeholder="Password"
                className="w-full rounded-md border border-gray-400 p-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {errors.password && (
                <span className="text-sm text-red-500">
                  {errors.password.message}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full rounded-md p-3 text-white transition duration-300 ${
                isLoading
                  ? "cursor-not-allowed bg-gray-400"
                  : "bg-secondary-500 hover:bg-primary-500"
              }`}
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>

            {error && (
              <span className="mt-4 block text-center text-sm text-red-500">
                Error: {error}
              </span>
            )}
          </form>

          <p className="mt-4 text-center text-sm">
            Don’t have an account?{" "}
            <a
              href="/signup"
              className="text-primary-500 hover:text-primary-300"
            >
              Sign Up
            </a>
          </p>
        </div>
      </div>
    </>
  );
}

export default Login;
