import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState } from "@/store";
import Loader from "@/scenes/Loader";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PolylinePoint {
  lat: number;
  lng: number;
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
  polyline: PolylinePoint[] | null;
}

function Dashboard() {
  const { token } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();

  const [routes, setRoutes] = useState<Route[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);

  useEffect(() => {
    if (!token) {
      setError("Please login to view your dashboard");
      return;
    }

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
              Authorization: token,
            },
            body: JSON.stringify({
              query: `
              query {
                getUserRoutes {
                  id
                  name
                  difficulty
                  description
                  landmarks
                  distance
                  city
                  created_at
                  polyline
                }
              }
            `,
            }),
          }
        );

        const { data, errors } = await response.json();
        if (errors?.length) {
          throw new Error(errors[0].message);
        }

        setRoutes(data?.getUserRoutes ?? []);
      } catch (err: any) {
        setError(err.message || "Failed to fetch routes");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoutes();
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
            onClick={() => navigate("/map", { state: { route: row.original } })}
          >
            View on Map
          </button>
        ),
      },
    ],
    [navigate]
  );

  const table = useReactTable({
    data: routes,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Name",
      "Difficulty",
      "Description",
      "Landmarks",
      "Distance (km)",
      "City",
      "Created At",
      "Polyline",
    ];
    const rows = routes.map((route) => [
      route.id,
      `"${route.name.replace(/"/g, '""')}"`,
      route.difficulty,
      `"${(route.description || "").replace(/"/g, '""')}"`,
      `"${(route.landmarks || "").replace(/"/g, '""')}"`,
      route.distance,
      `"${(route.city || "N/A").replace(/"/g, '""')}"`,
      new Date(route.created_at).toLocaleDateString(),
      `"${JSON.stringify(route.polyline || [])}"`,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "routes_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Export
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });

    // Title
    doc.setFontSize(18);
    doc.text("Your Routes", 14, 20);

    // Table
    autoTable(doc, {
      startY: 30,
      head: [
        [
          "ID",
          "Name",
          "Difficulty",
          "Description",
          "Landmarks",
          "Distance (km)",
          "City",
          "Created At",
          "Polyline",
        ],
      ],
      body: routes.map((route) => [
        route.id,
        route.name,
        route.difficulty,
        route.description || "N/A",
        route.landmarks || "N/A",
        route.distance,
        route.city || "N/A",
        new Date(route.created_at).toLocaleDateString(),
        JSON.stringify(route.polyline || []),
      ]),
      styles: { fontSize: 8, cellWidth: "wrap" },
      headStyles: { fillColor: [99, 102, 241] }, // Tailwind primary-500 purple
    });

    // Save PDF
    doc.save("routes_export.pdf");
  };

  return (
    <>
      <Loader isLoading={isLoading} />
      <div className="min-h-screen bg-primary-100 p-8">
        <div className="mx-auto mt-16 max-w-6xl">
          <div className="mb-6 flex justify-end gap-4">
            <button
              onClick={handleExportCSV}
              className="rounded-md bg-secondary-500 px-4 py-2 text-white hover:bg-primary-500"
              disabled={isLoading || routes.length === 0}
            >
              Download CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="rounded-md bg-secondary-500 px-4 py-2 text-white hover:bg-primary-500"
              disabled={isLoading || routes.length === 0}
            >
              Download PDF
            </button>
          </div>
          {error && <div className="text-center text-red-500">{error}</div>}
          {!error && routes.length === 0 && !isLoading && (
            <div className="text-center text-gray-400">
              No routes found. Create one!
            </div>
          )}
          {!error && routes.length > 0 && !isLoading && (
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
                          {header.column.getIsSorted() === "asc"
                            ? " 🔼"
                            : header.column.getIsSorted() === "desc"
                            ? " 🔽"
                            : ""}
                        </span>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-200">
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
    </>
  );
}

export default Dashboard;
