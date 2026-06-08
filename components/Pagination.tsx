"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  onPageChange?: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, baseUrl, onPageChange }: PaginationProps) {
  const getPageUrl = (page: number) => {
    const url = new URL(baseUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    url.searchParams.set("page", String(page));
    return url.toString().replace(url.origin, "");
  };

  const handlePageChange = (page: number) => {
    if (onPageChange) {
      onPageChange(page);
    }
  };

  const pageNumbers = [];
  const maxPagesToShow = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  if (endPage - startPage + 1 < maxPagesToShow) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  if (startPage > 1) {
    pageNumbers.push(1);
    if (startPage > 2) {
      pageNumbers.push("...");
    }
  }

  for (let i = startPage; i <= endPage; i += 1) {
    pageNumbers.push(i);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pageNumbers.push("...");
    }
    pageNumbers.push(totalPages);
  }

  return (
    <div className="pagination">
      <Link
        href={getPageUrl(Math.max(1, currentPage - 1))}
        className={currentPage === 1 ? "disabled" : ""}
        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
        aria-disabled={currentPage === 1}
      >
        <ChevronRight size={18} />
      </Link>

      {pageNumbers.map((page, index) => {
        if (page === "...") {
          return (
            <span key={`ellipsis-${index}`} className="pagination-ellipsis">
              ...
            </span>
          );
        }

        const pageNum = page as number;
        const isActive = pageNum === currentPage;

        return (
          <Link
            key={pageNum}
            href={getPageUrl(pageNum)}
            className={isActive ? "active" : ""}
            onClick={() => handlePageChange(pageNum)}
            aria-current={isActive ? "page" : undefined}
          >
            {pageNum}
          </Link>
        );
      })}

      <Link
        href={getPageUrl(Math.min(totalPages, currentPage + 1))}
        className={currentPage === totalPages ? "disabled" : ""}
        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
        aria-disabled={currentPage === totalPages}
      >
        <ChevronLeft size={18} />
      </Link>
    </div>
  );
}
