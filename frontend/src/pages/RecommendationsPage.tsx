import { useEffect, useState } from "react";
import { Box, Button, Container, Flex, Heading, SimpleGrid, Spinner, Stack, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import DashboardNavbar from "../components/DashboardNavbar";
import { api } from "../services/api";

const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
type TopicRec = { topicId: number; topicName: string; percentage: number | string; priority: string; message: string };
type CodingRec = { platform: string; username: string | null; totalSolved: number; contestRating: number | null; priority: string; message: string };
type Resume = { targetCompany: string | null; targetRole: string; analysis: { score?: number; missingSkills?: string[]; suggestions?: string[] } | null };

export default function RecommendationsPage() {
    const navigate = useNavigate();
    const [topics, setTopics] = useState<TopicRec[]>([]); const [coding, setCoding] = useState<CodingRec[]>([]); const [resume, setResume] = useState<Resume | null>(null); const [loading, setLoading] = useState(true);
    useEffect(() => { Promise.all([api.get("/recommendations", auth()), api.get("/recommendations/coding", auth()), api.get("/resumes/latest", auth())]).then(([a, b, c]) => { setTopics(a.data.data || []); setCoding(b.data.data || []); setResume(c.data.data || null); }).finally(() => setLoading(false)); }, []);
    return <Box minH="100vh" bg="#f6f8fc"><DashboardNavbar /><Container maxW="7xl" py={10}><Text color="blue.600" fontWeight="bold" fontSize="sm">PERSONALISED GUIDANCE</Text><Heading mt={2}>Your recommendations</Heading><Text mt={2} color="gray.600">Use these insights to decide what to practise next.</Text>{loading ? <Spinner mt={8} /> : <Stack mt={8} gap={8}>
        <Box><Heading size="md">Topics to focus on</Heading><SimpleGrid mt={4} columns={{ base: 1, md: 2 }} gap={4}>{topics.map((item) => <Flex key={item.topicId} bg="white" p={5} rounded="xl" borderWidth="1px" justify="space-between" gap={4}><Box><Text fontWeight="bold">{item.topicName}</Text><Text mt={2} color="gray.600">{item.message}</Text><Text mt={2} fontSize="sm" color="gray.500">Current performance: {item.percentage}% · {item.priority} priority</Text></Box><Button size="sm" colorPalette="blue" onClick={() => navigate(`/practice/${item.topicId}`)}>Practise</Button></Flex>)}</SimpleGrid></Box>
        <Box><Heading size="md">Coding-profile guidance</Heading><SimpleGrid mt={4} columns={{ base: 1, md: 2 }} gap={4}>{coding.map((item) => <Box key={item.platform} bg="white" p={5} rounded="xl" borderWidth="1px"><Flex justify="space-between"><Text fontWeight="bold">{item.platform}</Text><Text color="blue.600" fontWeight="bold">{item.totalSolved} solved</Text></Flex><Text mt={2} color="gray.600">{item.message}</Text></Box>)}</SimpleGrid></Box>
        {resume?.analysis && <Box bg="#172653" color="white" p={7} rounded="2xl"><Flex justify="space-between" align="start"><Box><Heading size="md">Resume improvement plan</Heading><Text mt={2} color="blue.100">{resume.targetRole}{resume.targetCompany ? ` at ${resume.targetCompany}` : ""}</Text></Box>{resume.analysis.score !== undefined && <Heading>{resume.analysis.score}/100</Heading>}</Flex><Text mt={5} fontWeight="bold">Skills to strengthen</Text><Text mt={2} color="blue.100">{resume.analysis.missingSkills?.join(", ") || "No major gaps detected"}</Text><Button mt={5} bg="white" color="#172653" onClick={() => navigate("/resume")}>Open resume analysis</Button></Box>}
    </Stack>}</Container></Box>;
}
