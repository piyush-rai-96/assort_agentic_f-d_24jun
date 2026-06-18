import React from "react";
import { Badge } from "impact-ui";
import Stack from "../components/Stack.jsx";
import Text from "../components/Text.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "./ModulePlaceholder.css";

/*
 * Temporary content shown for any module until its real view is built.
 * Reflects the active module selected in the Sidebar so the shell feels live.
 */
export default function ModulePlaceholder({ moduleLabel, groupLabel, activeModule }) {
  const { user } = useAuth();
  const isToday = activeModule === "today";
  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <Stack direction="column" gap={4} className="fd-placeholder">
      {groupLabel && (
        <Badge variant="subtle" label={groupLabel} className="fd-pill" />
      )}
      <Text variant="title" as="h1" className="fd-placeholder-title">
        {isToday ? `Welcome back, ${firstName}` : moduleLabel}
      </Text>
    </Stack>
  );
}
