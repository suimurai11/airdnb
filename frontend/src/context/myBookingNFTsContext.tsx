import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { ApiBookingNFTObject, BookingNFTListingQuery } from "@/types/types.ts";
import { useInfiniteQuery } from "@tanstack/react-query";
import { CONSTANTS, QueryKey } from "@/constants.ts";
import {
  constructUrlSearchParams,
  getBookingNFTRemainingNights,
  getNextPageParam,
} from "@/utils/helpers.ts";

// Define the context type
interface MyBookingNFTsContextType {
  myBookingNFTs: ApiBookingNFTObject[] | null;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  myLastBookingNFT: ApiBookingNFTObject | undefined;
  votingPower: number | null;
  activeBookingNFTs: ApiBookingNFTObject[] | null;
}

export const MyBookingNFTsContext =
  createContext<MyBookingNFTsContextType | null>(null);

export const MyBookingNFTsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const account = useCurrentAccount();
  const paramsBooking: BookingNFTListingQuery = {
    recipient: account?.address,
  };

  const {
    data: myBookingNFTs,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
  } = useInfiniteQuery({
    initialPageParam: null,
    queryKey: [QueryKey.BookingNFT, paramsBooking, ""],
    queryFn: async ({ pageParam }) => {
      const data = await fetch(
        CONSTANTS.apiEndpoint +
          "bookingNFTs" +
          constructUrlSearchParams({
            ...paramsBooking,
            ...(pageParam ? { cursor: pageParam as string } : {}),
          }),
      );
      return data.json();
    },
    select: (data): ApiBookingNFTObject[] =>
      data.pages.flatMap((page) => page.data),
    getNextPageParam,
  });
  useEffect(() => {
    if (!isLoading && !isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isLoading, isFetchingNextPage]);
  const myLastBookingNFT: ApiBookingNFTObject | undefined = useMemo(() => {
    return myBookingNFTs && myBookingNFTs.length
      ? myBookingNFTs[myBookingNFTs.length - 1]
      : undefined;
  }, [myBookingNFTs]);
  const [votingPower, activeBookingNFTs] = useMemo(() => {
    const activeBookingNFTs: ApiBookingNFTObject[] = [];
    let votingPower = 0;
    if (myBookingNFTs === undefined) return [null, null];
    myBookingNFTs.forEach((bookingNFT) => {
      const remainingNights = getBookingNFTRemainingNights(bookingNFT);
      if (remainingNights > 0) {
        votingPower += remainingNights;
        activeBookingNFTs.push(bookingNFT);
      }
    });
    return [votingPower, activeBookingNFTs];
  }, [myBookingNFTs]);

  return (
    <MyBookingNFTsContext.Provider
      value={{
        myBookingNFTs: myBookingNFTs ?? null,
        isLoading,
        isFetchingNextPage,
        myLastBookingNFT,
        votingPower,
        activeBookingNFTs,
      }}
    >
      {children}
    </MyBookingNFTsContext.Provider>
  );
};

export function useMyBookingNFTsContext() {
  const myBookingNFTsContext = useContext(MyBookingNFTsContext);
  if (!myBookingNFTsContext) {
    throw new Error("MyBookingNFTsContext must be used within the context");
  }
  return myBookingNFTsContext;
}
