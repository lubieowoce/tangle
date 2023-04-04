"use client";

import { useEffect, useState } from "react";
import { Text, TextProps } from "./common";
import { colorSets } from "./theme";

export function FlashOnMount({ children, ...props }: TextProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);
  const animation = "timestamp-entry-animation";
  return (
    <>
      <InlineStyle
        css={`
          @keyframes ${animation} {
            0% {
              opacity: 1;
              box-shadow: 0 0 8px rgba(255, 255, 255, 100);
              background-color: rgba(255, 255, 255, 100);
            }
            100% {
              opacity: 0.5;
              box-shadow: 0 0 8px rgba(255, 255, 255, 0);
              background-color: rgba(255, 255, 255, 0);
            }
          }
        `}
      />
      <Text
        as="small"
        style={{
          color: colorSets.server.color,
          animationName: animation,
          animationDuration: "700ms",
          animationFillMode: "both",
          animationPlayState: isMounted ? "running" : "paused",
        }}
        {...props}
      >
        {children}
      </Text>
    </>
  );
}

function InlineStyle({ css }: { css: string }) {
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
