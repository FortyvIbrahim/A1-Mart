"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getTransportById } from "../helpers/transports";

function useTransportById(transportId) {
  const [transport, setTransport] = useState(null);
  const [loading, setLoading] = useState(!!transportId);

  useEffect(() => {
    if (!transportId) {
      setTransport(null);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await getTransportById(transportId);
        if (response.code === 200) {
          setTransport(response.data || null);
        } else {
          throw response;
        }
      } catch (err) {
        console.error(err);
        toast.error("Error fetching transport!");
        setTransport(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [transportId]);

  return { transport, loading, refresh: () => {} };
}

export default useTransportById;
