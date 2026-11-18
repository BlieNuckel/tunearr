import useMediaQuery from "./useMediaQuery";

const MOBILE_QUERY = "(max-width: 639px)";

export default function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}
