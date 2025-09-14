"use client";
import { FC } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import SearchParamSkipSelector from "@/components/All/SearchParamSkipSelector/SearchParamSkipSelector";
import SearchParamLimitSelector from "@/components/All/SearchParamLimitSelector/SearchParamLimitSelector";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import styles from "./index.module.css";
import { usePaginationComponent } from "./usePaginationComponent";
import { IProps } from "./interfaces";

export const PaginationComponent: FC<IProps> = ({ total, baseUrl }) => {
  const { setNext, setPrev, currentPage, hasNextPage, hasPrevPage } = usePaginationComponent({ total, baseUrl });

  return (
    <div className={styles.paginationWrapper}>
      <Pagination className={styles.pagination}>
        <PaginationContent>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={styles.selector}>
                  <SearchParamSkipSelector />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={15} className={styles.tooltipContent}>
                <p className="paginator-text">Skip</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {hasPrevPage && (
            <PaginationItem className={styles.paginationItem} onClick={setPrev}>
              <PaginationPrevious className="paginator-text" />
            </PaginationItem>
          )}

          <PaginationItem className={styles.paginationItem}>
            <PaginationLink className="paginator-text">{currentPage}</PaginationLink>
          </PaginationItem>

          <PaginationItem className={styles.paginationItem}>
            <PaginationEllipsis className="paginator-text" />
          </PaginationItem>

          {hasNextPage && (
            <PaginationItem className={styles.paginationItem} onClick={setNext}>
              <PaginationNext className="paginator-text" />
            </PaginationItem>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={styles.selector}>
                  <SearchParamLimitSelector />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={15} className={styles.tooltipContent}>
                <p className="paginator-text">Limit</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </PaginationContent>
      </Pagination>
    </div>
  );
};