import * as Calendar from "expo-calendar";
import { Platform, Alert } from "react-native";
import { Activity } from "../types";

export async function requestCalendarPermissions(): Promise<boolean> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("Error requesting calendar permissions:", error);
    return false;
  }
}

export async function addActivityToCalendar(
  activity: Activity,
): Promise<boolean> {
  // For web, download .ics file instead
  if (Platform.OS === "web") {
    try {
      const startDate = new Date(activity.date);
      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours

      // Format dates for .ics file (YYYYMMDDTHHMMSS)
      const formatICSDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      };

      // Get the current website URL for the activity
      const activityUrl = `${window.location.origin}/activities/${activity.id}`;

      const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//GamePlan//Activity//EN",
        "BEGIN:VEVENT",
        `UID:${activity.id}@gameplan.app`,
        `DTSTAMP:${formatICSDate(new Date())}`,
        `DTSTART:${formatICSDate(startDate)}`,
        `DTEND:${formatICSDate(endDate)}`,
        `SUMMARY:${activity.title}`,
        `DESCRIPTION:${activity.description.replace(/\n/g, "\\n")}\\n\\nView on GamePlan: ${activityUrl}`,
        `LOCATION:${activity.location || ""}`,
        `URL:${activityUrl}`,
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      // Create blob and download
      const blob = new Blob([icsContent], {
        type: "text/calendar;charset=utf-8",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${activity.title.replace(/[^a-z0-9]/gi, "_")}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      window.alert(
        "Calendar file downloaded! Open it to add to your calendar.",
      );
      return true;
    } catch (error) {
      console.error("Error creating calendar file:", error);
      window.alert("Failed to create calendar file.");
      return false;
    }
  }

  // Mobile: Use expo-calendar
  try {
    const hasPermission = await requestCalendarPermissions();

    if (!hasPermission) {
      Alert.alert(
        "Permission Denied",
        "Please enable calendar access in your settings.",
      );
      return false;
    }

    // Get the default calendar
    const calendars = await Calendar.getCalendarsAsync(
      Calendar.EntityTypes.EVENT,
    );
    const defaultCalendar =
      calendars.find(
        (cal) =>
          cal.allowsModifications &&
          (Platform.OS === "ios" ? cal.source.name === "Default" : true),
      ) || calendars[0];

    if (!defaultCalendar) {
      Alert.alert("Error", "No calendar available.");
      return false;
    }

    // Create event
    const eventId = await Calendar.createEventAsync(defaultCalendar.id, {
      title: activity.title,
      startDate: activity.date,
      endDate: new Date(activity.date.getTime() + 2 * 60 * 60 * 1000), // 2 hours duration
      location: activity.location || "",
      notes: activity.description,
    });

    if (eventId) {
      Alert.alert("Success", "Activity added to your calendar!");
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error adding to calendar:", error);
    Alert.alert("Error", "Failed to add activity to calendar.");
    return false;
  }
}
