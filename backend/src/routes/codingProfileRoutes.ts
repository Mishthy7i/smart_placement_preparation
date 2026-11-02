import { Router } from "express";
import db from "../db";
import {
  authenticateToken,
  AuthenticatedRequest,
} from "../middleware/authMiddleware";

const router = Router();
const allowedPlatforms = ["LEETCODE", "CODECHEF", "HACKERRANK"] as const;
type Platform = (typeof allowedPlatforms)[number];

type LeetCodeStats = {
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  contestRating: number | null;
  raw: unknown;
};

type ExternalStats = {
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  contestRating: number | null;
  raw: unknown;
};

function getLeetCodeUsername(profileUrl: string, username?: string | null) {
  if (username?.trim()) return username.trim().replace(/^@/, "");

  try {
    const parsed = new URL(profileUrl);
    if (!/((www\.)?leetcode\.com)$/i.test(parsed.hostname)) return null;

    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments[0]?.toLowerCase() === "u") segments.shift();

    const candidate = segments[0];
    if (!candidate || ["profile", "problemset", "problems", "contest"].includes(candidate.toLowerCase())) {
      return null;
    }

    return decodeURIComponent(candidate);
  } catch {
    return null;
  }
}

function getExternalUsername(profileUrl: string, username?: string | null) {
  if (username?.trim()) return username.trim().replace(/^@/, "");
  try {
    const parsed = new URL(profileUrl);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const usersIndex = segments.findIndex((segment) => segment.toLowerCase() === "users");
    const candidate = usersIndex >= 0 ? segments[usersIndex + 1] : segments.at(-1);
    return candidate ? decodeURIComponent(candidate) : null;
  } catch {
    return null;
  }
}

async function fetchLeetCodeStats(username: string): Promise<LeetCodeStats> {
  const query = `
    query getUserStats($username: String!) {
      matchedUser(username: $username) {
        username
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
        }
      }
      userContestRanking(username: $username) {
        rating
      }
    }
  `;

  const response = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "SmartPlacementPortal/1.0",
      Accept: "application/json",
      Origin: "https://leetcode.com",
      Referer: "https://leetcode.com/",
    },
    body: JSON.stringify({
      query,
      variables: { username },
    }),
  });

  if (!response.ok) {
    throw new Error(`LeetCode request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: {
      matchedUser?: {
        username: string;
        submitStatsGlobal?: {
          acSubmissionNum: {
            difficulty: string;
            count: number;
            submissions: number;
          }[];
        };
      } | null;
      userContestRanking?: { rating: number } | null;
    };
    errors?: unknown[];
  };

  const matchedUser = payload.data?.matchedUser;

  if (payload.errors?.length || !matchedUser) {
    throw new Error(
      `LeetCode profile was not found or could not be read: ${JSON.stringify(payload.errors ?? [])}`
    );
  }

  const stats = matchedUser.submitStatsGlobal?.acSubmissionNum ?? [];
  const getCount = (difficulty: string) =>
    stats.find((item) => item.difficulty === difficulty)?.count ?? 0;

  return {
    totalSolved: getCount("All"),
    easySolved: getCount("Easy"),
    mediumSolved: getCount("Medium"),
    hardSolved: getCount("Hard"),
    contestRating: payload.data?.userContestRanking?.rating ?? null,
    raw: payload.data,
  };
}

async function fetchCodeChefStats(username: string): Promise<ExternalStats> {
  const urls = [
    `https://codechef-stats.tashif.codes/profile/${encodeURIComponent(username)}`,
    `https://codechef-api.vercel.app/handle/${encodeURIComponent(username)}`,
    `https://codechef-api.vercel.app/${encodeURIComponent(username)}`,
  ];
  let payload: Record<string, unknown> | null = null;

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "SmartPlacementPortal/1.0" },
      });
      if (response.ok) {
        payload = (await response.json()) as Record<string, unknown>;
        break;
      }
    } catch {
      // Try the fallback URL.
    }
  }

  if (!payload) throw new Error("CodeChef statistics provider is unavailable");

  const numeric = (...keys: string[]) => {
    for (const key of keys) {
      const value = Number(payload?.[key] ?? (payload?.data as Record<string, unknown> | undefined)?.[key]);
      if (Number.isFinite(value)) return value;
    }
    return 0;
  };

  const solved = numeric("totalProblemsSolved", "problemsSolved", "fullySolved", "totalSolved");
  const rating = numeric("currentRating", "rating", "highestRating");
  const profile = payload.profile as Record<string, unknown> | undefined;
  const profileSolved = Number(profile?.totalSolved ?? 0);
  const profileRating = Number(profile?.currentRating ?? 0);

  return {
    totalSolved: Number.isFinite(profileSolved) && profileSolved > 0 ? profileSolved : solved,
    easySolved: 0,
    mediumSolved: 0,
    hardSolved: 0,
    contestRating: Number.isFinite(profileRating) && profileRating > 0
      ? profileRating
      : Number.isFinite(rating) && rating > 0 ? rating : null,
    raw: payload,
  };
}

/**
 * @swagger
 * /api/coding-profiles:
 *   post:
 *     summary: Add or update a coding-platform profile
 *     tags: [Coding Profiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [platform, profileUrl]
 *             properties:
 *               platform:
 *                 type: string
 *                 enum: [LEETCODE, CODECHEF, HACKERRANK]
 *               username:
 *                 type: string
 *               profileUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Coding profile saved successfully
 *       400:
 *         description: Invalid profile data
 *       401:
 *         description: Authentication required
 */
router.post(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.userId;
      const { platform, username, profileUrl } = req.body as {
        platform: Platform;
        username?: string;
        profileUrl: string;
      };

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      if (
        !allowedPlatforms.includes(platform) ||
        typeof profileUrl !== "string" ||
        !profileUrl.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Valid platform and profile URL are required",
        });
      }

      try {
        new URL(profileUrl);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid profile URL",
        });
      }

      await db.query(
        `
        INSERT INTO coding_profiles
          (user_id, platform, username, profile_url)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          username = VALUES(username),
          profile_url = VALUES(profile_url),
          updated_at = CURRENT_TIMESTAMP
        `,
        [userId, platform, username?.trim() || null, profileUrl.trim()]
      );

      return res.status(201).json({
        success: true,
        message: "Coding profile saved successfully",
      });
    } catch (error) {
      console.error("Coding profile save error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to save coding profile",
      });
    }
  }
);

/**
 * @swagger
 * /api/coding-profiles:
 *   get:
 *     summary: Get the logged-in student's coding profiles
 *     tags: [Coding Profiles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coding profiles retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const [rows] = await db.query(
        `
        SELECT
          id,
          platform,
          username,
          profile_url,
          total_solved,
          easy_solved,
          medium_solved,
          hard_solved,
          contest_rating,
          current_streak,
          last_synced_at
        FROM coding_profiles
        WHERE user_id = ?
        ORDER BY platform ASC
        `,
        [userId]
      );

      return res.status(200).json({
        success: true,
        data: rows,
      });
    } catch (error) {
      console.error("Coding profile fetch error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch coding profiles",
      });
    }
  }
);

/**
 * @swagger
 * /api/coding-profiles/{profileId}/sync:
 *   post:
 *     summary: Synchronize a coding-platform profile
 *     tags: [Coding Profiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: profileId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Profile synchronized successfully
 *       400:
 *         description: Unsupported platform or invalid profile
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Profile not found
 *       502:
 *         description: External platform request failed
 */
router.post(
  "/:profileId/sync",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.userId;
      const profileId = Number(req.params.profileId);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      if (!Number.isInteger(profileId) || profileId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid profile ID",
        });
      }

      const [profileRows] = await db.query(
        `
        SELECT id, platform, username, profile_url
        FROM coding_profiles
        WHERE id = ? AND user_id = ?
        `,
        [profileId, userId]
      );

      const profiles = profileRows as {
        id: number;
        platform: Platform;
        username: string | null;
        profile_url: string;
      }[];

      if (profiles.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Coding profile not found",
        });
      }

      const profile = profiles[0];

      if (profile.platform === "HACKERRANK") {
        return res.status(400).json({
          success: false,
          message: "HackerRank synchronization is not available yet",
        });
      }

      const username = profile.platform === "LEETCODE"
        ? getLeetCodeUsername(profile.profile_url, profile.username)
        : getExternalUsername(profile.profile_url, profile.username);

      if (!username) {
        return res.status(400).json({
          success: false,
          message: "A valid LeetCode username or profile URL is required",
        });
      }

      const stats = profile.platform === "LEETCODE"
        ? await fetchLeetCodeStats(username)
        : await fetchCodeChefStats(username);

      await db.query(
        `
        UPDATE coding_profiles
        SET
          username = ?,
          total_solved = ?,
          easy_solved = ?,
          medium_solved = ?,
          hard_solved = ?,
          contest_rating = ?,
          stats = ?,
          last_synced_at = NOW()
        WHERE id = ? AND user_id = ?
        `,
        [
          username,
          stats.totalSolved,
          stats.easySolved,
          stats.mediumSolved,
          stats.hardSolved,
          stats.contestRating,
          JSON.stringify(stats.raw),
          profileId,
          userId,
        ]
      );

      return res.status(200).json({
        success: true,
        message: `${profile.platform === "LEETCODE" ? "LeetCode" : "CodeChef"} profile synchronized successfully`,
        data: {
          profileId,
          platform: profile.platform,
          username,
          totalSolved: stats.totalSolved,
          easySolved: stats.easySolved,
          mediumSolved: stats.mediumSolved,
          hardSolved: stats.hardSolved,
          contestRating: stats.contestRating,
          rawProviderData: stats.raw,
        },
      });
    } catch (error) {
      console.error("Coding profile sync error:", error);

      return res.status(502).json({
        success: false,
        message: error instanceof Error
          ? `CodeChef synchronization failed: ${error.message}`
          : "Unable to fetch statistics from the coding platform",
      });
    }
  }
);

export default router;
