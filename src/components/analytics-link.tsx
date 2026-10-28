"use client";

import Link from "next/link";
import type { Route } from "next";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { trackEvent, type AnalyticsEventName, type AnalyticsProperties } from "@/lib/analytics";

type AnalyticsLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: Route | URL | string;
  eventName: AnalyticsEventName;
  eventProperties?: AnalyticsProperties;
  children: ReactNode;
};

export function AnalyticsLink({
  href,
  eventName,
  eventProperties,
  onClick,
  children,
  ...props
}: AnalyticsLinkProps) {
  return (
    <Link
      href={href as Route}
      onClick={(event) => {
        trackEvent(eventName, eventProperties);
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
