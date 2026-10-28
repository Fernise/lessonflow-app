"use client";

import { useEffect } from "react";
import { trackEvent, type AnalyticsEventName, type AnalyticsProperties } from "@/lib/analytics";

export function AnalyticsPageView({
  eventName,
  eventProperties
}: {
  eventName: AnalyticsEventName;
  eventProperties?: AnalyticsProperties;
}) {
  useEffect(() => {
    trackEvent(eventName, eventProperties);
  }, [eventName, eventProperties]);

  return null;
}
