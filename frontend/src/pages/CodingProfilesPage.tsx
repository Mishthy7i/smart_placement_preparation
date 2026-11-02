import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { api } from "../services/api";
import DashboardNavbar from "../components/DashboardNavbar";
import {
  Alert,
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { ExternalLink, RefreshCw, Trophy } from "lucide-react";

type CodingProfile = {
  id: number;
  platform: string;
  username: string | null;
  profile_url: string;
  total_solved: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  contest_rating: number | null;
  last_synced_at: string | null;
};

function CodingProfilesPage() {
  const [profiles, setProfiles] = useState<CodingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");

  const loadProfiles = async () => {
    try {
      setError("");
      const response = await api.get("/coding-profiles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfiles(response.data.data ?? []);
    } catch {
      setError("Unable to load coding profiles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfiles();
  }, []);

  const syncProfile = async (profileId: number) => {
    try {
      setSyncingId(profileId);
      setError("");
      await api.post(`/coding-profiles/${profileId}/sync`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadProfiles();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message ?? "Profile synchronization failed.");
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <Box minH="100vh" bg="#f7f9fc">
      <DashboardNavbar />
      <Container maxW="7xl" py={{ base: 8, md: 12 }}>
        <Flex justify="space-between" align={{ base: "start", md: "center" }} gap={5} direction={{ base: "column", md: "row" }}>
          <Box>
            <Text color="blue.600" fontWeight="800" fontSize="sm" letterSpacing=".12em">EXTERNAL PROGRESS</Text>
            <Heading mt={2} color="#111b3d" letterSpacing="-.04em">Coding profiles</Heading>
            <Text mt={2} color="gray.600">Connect your public coding profiles and keep your preparation data in one place.</Text>
          </Box>
          <Button asChild variant="outline"><RouterLink to="/dashboard">Back to dashboard</RouterLink></Button>
        </Flex>

        {error && <Alert.Root status="error" mt={6}><Alert.Indicator /><Alert.Content><Alert.Title>{error}</Alert.Title></Alert.Content></Alert.Root>}

        {loading ? (
          <Flex justify="center" py={20}><Spinner size="xl" colorPalette="blue" /></Flex>
        ) : profiles.length === 0 ? (
          <Box mt={8} p={8} bg="white" rounded="2xl" borderWidth="1px" borderColor="gray.200">
            <Text fontWeight="700">No coding profiles connected yet.</Text>
            <Text color="gray.600" mt={2}>Add a profile from the coding-profiles form when it is available.</Text>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6} mt={8}>
            {profiles.map((profile) => (
              <Box key={profile.id} bg="white" rounded="2xl" borderWidth="1px" borderColor="gray.200" p={{ base: 5, md: 7 }} shadow="sm">
                <Flex justify="space-between" align="start" gap={4}>
                  <Flex gap={3} align="center">
                    <Flex w="12" h="12" rounded="xl" bg="orange.50" color="orange.600" align="center" justify="center"><Trophy size={22} /></Flex>
                    <Box><Heading size="md" color="#111b3d">{profile.platform}</Heading><Text color="gray.600">{profile.username || "Profile username unavailable"}</Text></Box>
                  </Flex>
                  <Badge colorPalette="green">Synced data</Badge>
                </Flex>

                <SimpleGrid columns={2} gap={3} mt={7}>
                  <Stat label="Total solved" value={profile.total_solved} />
                  <Stat label="Contest rating" value={profile.contest_rating ?? "—"} />
                  <Stat label="Easy" value={profile.easy_solved} color="green.600" />
                  <Stat label="Medium" value={profile.medium_solved} color="orange.600" />
                  <Stat label="Hard" value={profile.hard_solved} color="red.600" />
                  <Stat label="Last synced" value={profile.last_synced_at ? new Date(profile.last_synced_at).toLocaleDateString() : "Never"} />
                </SimpleGrid>

                <Stack mt={6} direction={{ base: "column", sm: "row" }}>
                  <Button colorPalette="blue" loading={syncingId === profile.id} onClick={() => void syncProfile(profile.id)}><RefreshCw size={16} /> Sync now</Button>
                  <Button asChild variant="outline"><a href={profile.profile_url} target="_blank" rel="noreferrer">Open profile <ExternalLink size={16} /></a></Button>
                </Stack>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </Container>
    </Box>
  );
}

function Stat({ label, value, color = "#111b3d" }: { label: string; value: number | string; color?: string }) {
  return <Box bg="gray.50" rounded="xl" p={4}><Text color="gray.500" fontSize="sm">{label}</Text><Text mt={1} fontSize="xl" fontWeight="800" color={color}>{value}</Text></Box>;
}

export default CodingProfilesPage;
