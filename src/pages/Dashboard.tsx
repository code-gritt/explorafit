import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";

interface Route {
  id: string;
  name: string;
  difficulty: string;
  distance: number;
  city: string | null;
  created_at: string;
}

function Dashboard() {
  const { token } = useSelector((state: RootState) => state.auth);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);

  useEffect(() => {
    const fetchRoutes = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          "https://explorafit-backend.onrender.com",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `${token}`,
            },
            body: JSON.stringify({
              query: `
              query {
                getUserRoutes {
                  id
                  name
                  difficulty
                  distance
                  city
                  created_at
                }
              }
            `,
            }),
          }
        );

        const { data: responseData, errors } = await response.json();
        if (errors) throw new Error(errors[0].message);

        setRoutes(responseData.getUserRoutes);
      } catch (e: any) {
        setError(e.message || "Failed to fetch routes");
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchRoutes();
    } else {
      setError("Please login to view your dashboard");
      setIsLoading(false);
    }
  }, [token]);

  const columns = useMemo<ColumnDef<Route>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "difficulty", header: "Difficulty" },
      { accessorKey: "distance", header: "Distance (km)" },
      {
        accessorKey: "city",
        header: "City",
        cell: (info) => info.getValue() || "N/A",
      },
      {
        accessorKey: "created_at",
        header: "Created At",
        cell: (info) =>
          new Date(info.getValue() as string).toLocaleDateString(),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <button
            className="text-primary-500 hover:text-primary-300"
            onClick={() => alert(`View route ${row.original.id} on map`)}
          >
            View on Map
          </button>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: routes,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="min-h-screen bg-primary-100 p-8">
      <div className="mx-auto mt-16 max-w-6xl">
        {isLoading ? (
          <div className="text-center text-gray-400">Loading routes...</div>
        ) : error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : routes.length === 0 ? (
          <div className="text-center text-gray-400">
            No routes found. Create one!
          </div>
        ) : (
          <table className="w-full overflow-hidden rounded-lg bg-white shadow-md">
            <thead className="bg-secondary-500 text-white">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="cursor-pointer p-3 text-left"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      <span>
                        {{
                          asc: " 🔼",
                          desc: " 🔽",
                        }[header.column.getIsSorted() as string] ?? ""}
                      </span>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-400">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
