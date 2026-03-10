type PageProps<P = Record<string, string>> = {
  params: P;
  searchParams?: Record<string, string | string[] | undefined>;
};
