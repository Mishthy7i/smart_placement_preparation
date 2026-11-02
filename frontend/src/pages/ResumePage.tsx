import { useState } from "react";
import {
    Box,
    Button,
    Container,
    Flex,
    Heading,
    Spinner,
    Stack,
    Text,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import DashboardNavbar from "../components/DashboardNavbar";

type AnalysisResult = {
    targetCompany: string | null;
    targetRole: string;
    matchedProfile: boolean;
    requiredSkills: string[];
    foundSkills: string[];
    missingSkills: string[];
    suggestions: string[];
    score?: number;
    summary?: string;
    provider?: string;
    actionPlan?: string[];
    atsKeywords?: string[];
};

function ResumePage() {
    const navigate = useNavigate();

    const [file, setFile] = useState<File | null>(null);
    const [targetCompany, setTargetCompany] = useState("");
    const [targetRole, setTargetRole] = useState("");
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0] || null;
        setFile(selectedFile);
    };

    const handleAnalyze = async () => {
        if (!file) {
            setError("Please select a resume file");
            return;
        }

        if (!targetRole.trim()) {
            setError("Please enter your target role");
            return;
        }

        setLoading(true);
        setError("");
        setAnalysis(null);

        try {
            const token = localStorage.getItem("token");

            const formData = new FormData();
            formData.append("resume", file);
            formData.append("targetCompany", targetCompany);
            formData.append("targetRole", targetRole);

            const uploadResponse = await fetch(
                `${import.meta.env.VITE_API_URL}/resumes/upload`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            );

            const uploadData = await uploadResponse.json();

            if (!uploadResponse.ok) {
                throw new Error(
                    uploadData.message || "Resume upload failed"
                );
            }

            const resumeId = uploadData.data.resumeId;

            const analysisResponse = await api.post(
                `/resumes/${resumeId}/analyze`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const result = analysisResponse.data.data;
            setAnalysis({
                targetCompany: result.targetCompany ?? targetCompany,
                targetRole: result.targetRole ?? targetRole,
                matchedProfile: Boolean(result.matchedProfile),
                requiredSkills: result.requiredSkills ?? result.atsKeywords ?? [],
                foundSkills: result.foundSkills ?? result.strengths ?? [],
                missingSkills: result.missingSkills ?? [],
                suggestions: result.suggestions ?? [],
                score: result.score,
                summary: result.summary,
                provider: result.provider,
                actionPlan: result.actionPlan ?? [],
                atsKeywords: result.atsKeywords ?? [],
            });
        } catch (error: any) {
            if (error.response?.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                navigate("/login");
            } else {
                setError(
                    error.message ||
                    error.response?.data?.message ||
                    "Unable to analyze the resume"
                );
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box minH="100vh" bg="gray.50">
            <DashboardNavbar />

            <Container maxW="container.lg" py={{ base: 8, md: 12 }}>
                <Stack gap={2} mb={8}>
                    <Text color="blue.600" fontWeight="bold" fontSize="sm">
                        RESUME ANALYZER
                    </Text>

                    <Heading>Improve your resume for your target role</Heading>

                    <Text color="gray.600">
                        Upload your resume and get skill-based, explainable suggestions.
                    </Text>
                </Stack>

                <Box bg="white" p={{ base: 6, md: 8 }} rounded="2xl" shadow="sm">
                    <Stack gap={5}>
                        <Box>
                            <Text fontWeight="bold" mb={2}>
                                Resume file
                            </Text>

                            <input
                                type="file"
                                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                onChange={handleFileChange}
                            />

                            {file && (
                                <Text mt={2} fontSize="sm" color="gray.600">
                                    Selected: {file.name}
                                </Text>
                            )}
                        </Box>

                        <Box>
                            <Text fontWeight="bold" mb={2}>
                                Target company
                            </Text>

                            <input
                                value={targetCompany}
                                onChange={(event) =>
                                    setTargetCompany(event.target.value)
                                }
                                placeholder="Example: Google"
                                style={inputStyle}
                            />
                        </Box>

                        <Box>
                            <Text fontWeight="bold" mb={2}>
                                Target role
                            </Text>

                            <input
                                value={targetRole}
                                onChange={(event) =>
                                    setTargetRole(event.target.value)
                                }
                                placeholder="Example: Frontend Developer"
                                style={inputStyle}
                            />
                        </Box>

                        {error && <Text color="red.500">{error}</Text>}

                        <Button
                            colorPalette="blue"
                            size="lg"
                            onClick={handleAnalyze}
                            disabled={loading}
                        >
                            {loading ? <Spinner size="sm" /> : "Analyze Resume"}
                        </Button>
                    </Stack>
                </Box>

                {analysis && (
                    <Stack gap={6} mt={8}>
                        <Box bg="white" p={7} rounded="2xl" shadow="sm">
                            <Flex justify="space-between" align="center" gap={4}>
                                <Heading size="md">Analysis Summary</Heading>
                                <Button variant="outline" size="sm" onClick={() => window.print()}>
                                    Print / Save PDF
                                </Button>
                            </Flex>

                            {analysis.score !== undefined && (
                                <Flex align="center" gap={5} mt={4}>
                                    <Box w="110px" h="110px" rounded="full" display="flex" alignItems="center" justifyContent="center" bg={`conic-gradient(#3155d9 ${analysis.score}%, #e8edf5 ${analysis.score}% 100%)`}>
                                        <Flex w="86px" h="86px" rounded="full" bg="white" align="center" justify="center"><Text fontSize="2xl" fontWeight="800" color="blue.600">{analysis.score}</Text></Flex>
                                    </Box>
                                    <Box><Text fontWeight="700" color="#111b3d">Resume match score</Text><Text color="gray.600" fontSize="sm">Based on your resume and target role.</Text></Box>
                                </Flex>
                            )}

                            {analysis.summary && (
                                <Text mt={2} color="gray.600">{analysis.summary}</Text>
                            )}

                            <Text mt={3} color="gray.600">
                                Target role: {analysis.targetRole}
                            </Text>

                            {analysis.targetCompany && (
                                <Text color="gray.600">
                                    Target company: {analysis.targetCompany}
                                </Text>
                            )}

                            <Text
                                mt={3}
                                color={analysis.matchedProfile ? "green.600" : "orange.600"}
                                fontWeight="bold"
                            >
                                {analysis.matchedProfile
                                    ? "Matched company-role profile"
                                    : "General role profile used"}
                            </Text>

                            {analysis.provider && (
                                <Text mt={2} fontSize="sm" color="purple.600" fontWeight="600">
                                    Analysis provider: {analysis.provider}
                                </Text>
                            )}
                        </Box>

                        {analysis.atsKeywords && analysis.atsKeywords.length > 0 && (
                            <Box bg="white" p={7} rounded="2xl" shadow="sm">
                                <Heading size="md">ATS keywords to consider</Heading>
                                <Text mt={2} color="gray.600" fontSize="sm">Use these only when they accurately describe your experience.</Text>
                                <Flex gap={3} wrap="wrap" mt={4}>
                                    {analysis.atsKeywords.map((keyword) => <Box key={keyword} px={4} py={2} rounded="full" bg="blue.50" color="blue.700" fontWeight="600">{keyword}</Box>)}
                                </Flex>
                            </Box>
                        )}

                        <Box bg="white" p={7} rounded="2xl" shadow="sm">
                            <Heading size="md">Required Role Skills</Heading>

                            <Stack mt={4} gap={2}>
                                {analysis.requiredSkills.map((skill) => (
                                    <Box
                                        key={skill}
                                        px={4}
                                        py={2}
                                        rounded="lg"
                                        bg="blue.50"
                                        color="blue.700"
                                    >
                                        {skill}
                                    </Box>
                                ))}
                            </Stack>
                        </Box>

                        <Box bg="white" p={7} rounded="2xl" shadow="sm">
                            <Heading size="md">Skills Found</Heading>

                            {analysis.foundSkills.length > 0 ? (
                                <Stack mt={4} gap={2}>
                                    {analysis.foundSkills.map((skill) => (
                                        <Box
                                            key={skill}
                                            px={4}
                                            py={2}
                                            rounded="lg"
                                            bg="green.50"
                                            color="green.700"
                                        >
                                            {skill}
                                        </Box>
                                    ))}
                                </Stack>
                            ) : (
                                <Text mt={3} color="gray.600">
                                    No matching skills were detected.
                                </Text>
                            )}
                        </Box>

                        <Box bg="white" p={7} rounded="2xl" shadow="sm">
                            <Heading size="md">Skills to Consider Adding</Heading>

                            {analysis.missingSkills.length > 0 ? (
                                <Stack mt={4} gap={2}>
                                    {analysis.missingSkills.map((skill) => (
                                        <Box
                                            key={skill}
                                            px={4}
                                            py={2}
                                            rounded="lg"
                                            bg="orange.50"
                                            color="orange.700"
                                        >
                                            {skill}
                                        </Box>
                                    ))}
                                </Stack>
                            ) : (
                                <Text mt={3} color="green.600">
                                    Your resume covers the main detected skills.
                                </Text>
                            )}
                        </Box>

                        <Box bg="white" p={7} rounded="2xl" shadow="sm">
                            <Heading size="md">Suggestions</Heading>

                            <Stack mt={4} gap={3}>
                                {analysis.suggestions.map((suggestion) => (
                                    <Box
                                        key={suggestion}
                                        p={4}
                                        rounded="lg"
                                        bg="gray.50"
                                        color="gray.700"
                                    >
                                        {suggestion}
                                    </Box>
                                ))}
                            </Stack>
                        </Box>

                        {analysis.actionPlan && analysis.actionPlan.length > 0 && (
                            <Box bg="white" p={7} rounded="2xl" shadow="sm">
                                <Heading size="md">Action Plan</Heading>
                                <Stack mt={4} gap={3}>
                                    {analysis.actionPlan.map((item) => (
                                        <Box key={item} p={4} rounded="lg" bg="purple.50" color="purple.700">{item}</Box>
                                    ))}
                                </Stack>
                            </Box>
                        )}
                    </Stack>
                )}
            </Container>
        </Box>
    );
}

const inputStyle = {
    width: "100%",
    padding: "12px",
    border: "1px solid #CBD5E0",
    borderRadius: "8px",
    fontSize: "16px",
};

export default ResumePage;
