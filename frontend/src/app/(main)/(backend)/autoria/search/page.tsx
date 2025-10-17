import { Metadata } from "next";
import SearchPage from "@/components/AutoRia/Pages/SearchPage";

export const metadata: Metadata = {
  title: "Search Cars - CarHub",
  description: "Search and filter cars by various criteria",
};

// Принудительно делаем страницу динамической
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const Search = () => {
  return <SearchPage />;
};

export default Search;
