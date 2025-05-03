"use client";

import {
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { decryptKey } from "@/lib/utils";
import { validatePasskey } from "@/lib/utils/validatePasskey";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  requiresAuth?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  requiresAuth = false,
}: DataTableProps<TData, TValue>) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(requiresAuth);

  useEffect(() => {
    // Only perform auth check if requiresAuth is true
    if (requiresAuth) {
      const checkAccess = async () => {
        try {
          const encryptedKey =
            typeof window !== "undefined"
              ? window.localStorage.getItem("accessKey")
              : null;

          if (encryptedKey) {
            const decryptedKey = decryptKey(encryptedKey);
            const isValid = await validatePasskey(decryptedKey, "admin");

            if (!isValid) {
              router.push("/");
            }
          } else {
            router.push("/");
          }
        } catch (error) {
          console.error("Authentication error:", error);
          // Don't redirect on error to prevent unhandled promise rejections
          // The user can be redirected elsewhere by navigation or timeout
        } finally {
          setIsLoading(false);
        }
      };

      checkAccess();
    }
  }, [requiresAuth, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="data-table">
        <div className="p-8 text-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="data-table">
      <Table className="shad-table">
        <TableHeader className="bg-gray-50 dark:bg-dark-200">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="shad-table-row-header">
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="shad-table-row"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="table-actions">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="shad-gray-btn"
        >
          <ChevronLeft size={16} />
          <span className="sr-only">Previous Page</span>
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700 dark:text-white">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="shad-gray-btn"
        >
          <ChevronRight size={16} />
          <span className="sr-only">Next Page</span>
        </Button>
      </div>
    </div>
  );
}
