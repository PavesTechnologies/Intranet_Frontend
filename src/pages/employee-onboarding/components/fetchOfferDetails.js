import axios from "axios";
import { getOfferWithJoiningStatus } from "./offerStatus";

export const fetchOfferDetailsList = async (baseUrl, token) => {
  const summaryRes = await axios.get(
    `${baseUrl}/offerletters/user_id/details`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const summaries = summaryRes.data || [];

  const detailedOffers = await Promise.all(
    summaries.map(async (offer) => {
      try {
        const detailRes = await axios.get(
          `${baseUrl}/offerletters/offer/${offer.user_uuid}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        return getOfferWithJoiningStatus({
          ...offer,
          ...(detailRes.data || {}),
        });
      } catch (error) {
        console.error(
          `Failed to fetch detailed offer for ${offer.user_uuid}`,
          error
        );
        return getOfferWithJoiningStatus(offer);
      }
    })
  );

  return detailedOffers;
};
