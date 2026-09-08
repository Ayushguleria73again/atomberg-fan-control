import { NormalizedFanState } from "./types";

export type ParsedIntent =
  | {
      type: "command";
      deviceId: string;
      fanName: string;
      action: "power";
      value: boolean;
      spokenDescription: string;
    }
  | {
      type: "command";
      deviceId: string;
      fanName: string;
      action: "speed";
      value: number;
      spokenDescription: string;
    }
  | {
      type: "command";
      deviceId: string;
      fanName: string;
      action: "led";
      value: boolean;
      spokenDescription: string;
    }
  | {
      type: "command";
      deviceId: string;
      fanName: string;
      action: "sleep";
      value: boolean;
      spokenDescription: string;
    }
  | {
      type: "command";
      deviceId: string;
      fanName: string;
      action: "timer";
      value: number;
      spokenDescription: string;
    }
  | {
      type: "broadcast";
      action: "power";
      value: boolean;
      spokenDescription: string;
    }
  | {
      type: "disambiguate";
      message: string;
      candidateFans: string[];
      rawTranscript: string;
    }
  | {
      type: "unknown";
      transcript: string;
      reason: string;
    };

// Spoken numbers dictionary
const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  "0": 0,
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
};

// Aliases for each fan
interface FanAliasMapping {
  deviceId: string;
  name: string;
  aliases: string[];
}

const FAN_ALIASES: FanAliasMapping[] = [
  {
    deviceId: "3844be6b7c80",
    name: "Hall Fan 1",
    aliases: [
      "hall fan one",
      "hall fan 1",
      "first hall fan",
      "hall number one",
      "hall number 1",
      "hall first",
      "hall one",
      "hall 1",
      "first hall",
    ],
  },
  {
    deviceId: "3844be54dfa4",
    name: "Hall Fan 2",
    aliases: [
      "hall fan two",
      "hall fan 2",
      "second hall fan",
      "hall number two",
      "hall number 2",
      "hall second",
      "hall two",
      "hall 2",
      "second hall",
    ],
  },
  {
    deviceId: "3844be560e10",
    name: "Balcony Fan",
    aliases: [
      "balcony fan",
      "branda fan",
      "verandah fan",
      "veranda fan",
      "balcony",
      "veranda",
      "verandah",
      "branda",
      "terrace",
      "outside",
      "patio",
    ],
  },
  {
    deviceId: "8cfd495a1730",
    name: "Master Bedroom Fan",
    aliases: [
      "master bedroom fan",
      "master bedroom",
      "bedroom fan",
      "bedroom",
      "bed room",
      "master room",
      "master fan",
      "living room fan",
      "living room",
    ],
  },
];

/**
 * Extract integer number from a string, prioritizing explicit digits or number words.
 */
function extractNumber(text: string): number | null {
  // Check for direct regex match for numbers like "speed 4" or "in 2 hours"
  const digitMatch = text.match(/\b([0-6])\b/);
  if (digitMatch) {
    return parseInt(digitMatch[1], 10);
  }

  for (const [word, val] of Object.entries(NUMBER_WORDS)) {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    if (regex.test(text)) {
      return val;
    }
  }

  return null;
}

/**
 * Parses a recognized speech transcript into a structured fan intent.
 */
export function parseVoiceIntent(
  rawTranscript: string,
  currentFansState: NormalizedFanState[] = []
): ParsedIntent {
  const normalized = rawTranscript.trim().toLowerCase();

  if (!normalized) {
    return {
      type: "unknown",
      transcript: rawTranscript,
      reason: "No speech recognized.",
    };
  }

  // 1. Check for Broadcast intents ("turn everything off / on")
  const isEverythingOff =
    /\b(turn|switch|power|shut)?\s*(everything|all|all\s*fans|all\s*the\s*fans)\s*(off|down|band)\b/i.test(
      normalized
    ) ||
    /\b(turn\s*off|switch\s*off|shut\s*down)\s*(everything|all|all\s*fans)\b/i.test(
      normalized
    );

  if (isEverythingOff) {
    return {
      type: "broadcast",
      action: "power",
      value: false,
      spokenDescription: "Turning off all fans",
    };
  }

  const isEverythingOn =
    /\b(turn|switch|power)?\s*(everything|all|all\s*fans|all\s*the\s*fans)\s*(on|up|chalu)\b/i.test(
      normalized
    ) ||
    /\b(turn\s*on|switch\s*on|start)\s*(everything|all|all\s*fans)\b/i.test(
      normalized
    );

  if (isEverythingOn) {
    return {
      type: "broadcast",
      action: "power",
      value: true,
      spokenDescription: "Turning on all fans",
    };
  }

  // 2. Identify target fan
  let matchedFan: FanAliasMapping | null = null;
  let matchedAlias = "";

  // Sort aliases by length descending so longer phrases match first
  for (const fan of FAN_ALIASES) {
    for (const alias of fan.aliases) {
      if (normalized.includes(alias)) {
        if (!matchedFan || alias.length > matchedAlias.length) {
          matchedFan = fan;
          matchedAlias = alias;
        }
      }
    }
  }

  // Ambiguity check: user said "hall" or "hall fan" without specifying 1 vs 2
  if (!matchedFan && /\bhall(\s*fan)?\b/i.test(normalized)) {
    return {
      type: "disambiguate",
      message: "Which Hall fan? Please say Hall One or Hall Two.",
      candidateFans: ["Hall Fan 1", "Hall Fan 2"],
      rawTranscript,
    };
  }

  // If no fan was named
  if (!matchedFan) {
    if (currentFansState.length === 1) {
      const single = currentFansState[0];
      matchedFan = {
        deviceId: single.id,
        name: single.name,
        aliases: [single.name.toLowerCase()],
      };
    } else {
      return {
        type: "unknown",
        transcript: rawTranscript,
        reason:
          "Couldn't identify which fan (e.g., 'Hall One', 'Hall Two', 'Balcony', or 'Bedroom').",
      };
    }
  }

  const deviceId = matchedFan.deviceId;
  const fanName = matchedFan.name;
  const currentFanState = currentFansState.find((f) => f.id === deviceId);
  const currentSpeed = currentFanState?.speed ?? 3;

  // Remove the matched fan alias from actionText to avoid digit confusion ("hall one speed four")
  const actionText = normalized.replace(matchedAlias, "").trim();

  // 3. Detect Action & Value

  // A. LED / Underlight commands
  if (
    /\b(light|led|underlight|lamp|batti|roshni)\b/i.test(actionText) ||
    /\b(light|led|underlight|lamp|batti|roshni)\b/i.test(normalized)
  ) {
    const isOff = /\b(off|band|close|disable)\b/i.test(actionText) || /\b(turn\s*off|switch\s*off)\b/i.test(normalized);
    const value = !isOff;

    return {
      type: "command",
      deviceId,
      fanName,
      action: "led",
      value,
      spokenDescription: `${fanName} underlight ${value ? "on" : "off"}`,
    };
  }

  // B. Sleep Mode commands
  if (/\b(sleep|sleep\s*mode)\b/i.test(actionText) || /\b(sleep|sleep\s*mode)\b/i.test(normalized)) {
    const isOff = /\b(off|stop|disable|deactivate|cancel)\b/i.test(actionText);
    const value = !isOff;

    return {
      type: "command",
      deviceId,
      fanName,
      action: "sleep",
      value,
      spokenDescription: `Sleep mode ${value ? "activated" : "deactivated"} for ${fanName}`,
    };
  }

  // C. Timer commands ("turn off in 2 hours", "timer 3 hours", "timer off")
  if (
    /\b(timer|off\s*in|stop\s*in|in\s*\w+\s*hour|in\s*\d+\s*hour)\b/i.test(actionText) ||
    /\b(timer|off\s*in|stop\s*in|in\s*\w+\s*hour|in\s*\d+\s*hour)\b/i.test(normalized)
  ) {
    const timerNum = extractNumber(actionText);
    if (timerNum !== null && timerNum > 0) {
      return {
        type: "command",
        deviceId,
        fanName,
        action: "timer",
        value: timerNum,
        spokenDescription: `Timer set to ${timerNum} hour${timerNum > 1 ? "s" : ""} for ${fanName}`,
      };
    }

    if (/\b(off|cancel|zero|none|disable)\b/i.test(actionText)) {
      return {
        type: "command",
        deviceId,
        fanName,
        action: "timer",
        value: 0,
        spokenDescription: `Timer cleared for ${fanName}`,
      };
    }
  }

  // D. Relative speed: Max / Full
  if (/\b(max|maximum|full|full\s*speed|fastest|high)\b/i.test(actionText)) {
    return {
      type: "command",
      deviceId,
      fanName,
      action: "speed",
      value: 6,
      spokenDescription: `Setting ${fanName} to maximum speed 6`,
    };
  }

  // E. Relative speed: Min / Lowest
  if (/\b(min|minimum|lowest|slowest|slow)\b/i.test(actionText) && !/\bslower\b/i.test(actionText)) {
    return {
      type: "command",
      deviceId,
      fanName,
      action: "speed",
      value: 1,
      spokenDescription: `Setting ${fanName} to minimum speed 1`,
    };
  }

  // F. Relative speed: Faster / Increase
  if (/\b(faster|speed\s*up|increase|tez)\b/i.test(actionText)) {
    const newSpeed = Math.min(6, currentSpeed + 1);
    return {
      type: "command",
      deviceId,
      fanName,
      action: "speed",
      value: newSpeed,
      spokenDescription: `Increasing ${fanName} to speed ${newSpeed}`,
    };
  }

  // G. Relative speed: Slower / Decrease
  if (/\b(slower|slow\s*down|decrease|kam|dheema)\b/i.test(actionText)) {
    const newSpeed = Math.max(1, currentSpeed - 1);
    return {
      type: "command",
      deviceId,
      fanName,
      action: "speed",
      value: newSpeed,
      spokenDescription: `Decreasing ${fanName} to speed ${newSpeed}`,
    };
  }

  // H. Absolute speed ("speed 4", "level 3", "set to 5", "run at 2")
  if (
    /\b(speed|level|set\s*to|at)\b/i.test(actionText) ||
    extractNumber(actionText) !== null
  ) {
    const num = extractNumber(actionText);
    if (num !== null && num >= 1 && num <= 6) {
      return {
        type: "command",
        deviceId,
        fanName,
        action: "speed",
        value: num,
        spokenDescription: `Setting ${fanName} to speed ${num}`,
      };
    }
  }

  // I. Power On / Off
  if (
    /\b(turn\s*off|switch\s*off|stop|power\s*off|shut\s*off|band)\b/i.test(
      actionText
    ) ||
    /\b(turn\s*off|switch\s*off|power\s*off|shut\s*off)\b/i.test(normalized)
  ) {
    return {
      type: "command",
      deviceId,
      fanName,
      action: "power",
      value: false,
      spokenDescription: `Turning off ${fanName}`,
    };
  }

  if (
    /\b(turn\s*on|switch\s*on|start|power\s*on|run|chalu)\b/i.test(
      actionText
    ) ||
    /\b(turn\s*on|switch\s*on|power\s*on)\b/i.test(normalized)
  ) {
    return {
      type: "command",
      deviceId,
      fanName,
      action: "power",
      value: true,
      spokenDescription: `Turning on ${fanName}`,
    };
  }

  return {
    type: "unknown",
    transcript: rawTranscript,
    reason: `Understood ${fanName}, but didn't catch an action like 'on', 'off', 'speed 4', 'light on', or 'sleep'.`,
  };
}
