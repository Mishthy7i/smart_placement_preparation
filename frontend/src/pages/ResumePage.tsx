import { useState } from "react";
import {
    Box,
    Button,
    Container,
    Flex,
    Heading,
    List,
    ListItem,
    Spinner,
    Stack,
    Text,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

type AnalysisResult = {
    targetCompany: string | null;
    targetRole: string;
    foundSkills: string[];
    missingSkills: string[];
    suggestions: string[];
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
        if (!file || !targetRole) {
            setError("Please select a resume and enter your target role");
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
                throw new Error(uploadData.message || "Resume upload failed");
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

            setAnalysis(analysisResponse.data.data);
        } catch (error: any) {
            if (error.response?.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                navigate("/login");
            } else {
                setError(
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
            <Box bg="white" borderBottomWidth="1px">
                <Container maxW="7xl" py={5}>
                    <Flex justify="space-between" align="center">
                        <Heading size="md" color="blue.700">
                            SmartPrep
                        </Heading>

                        <Button
                            variant="outline"
                            onClick={() => navigate("/dashboard")}
                        >
                            Back to Dashboard
                        </Button>
                    </Flex>
                </Container>
            </Box>

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
                                placeholder="Example: TCS"
                                style={inputStyle}
                            />
                        </Box>

                        <Box>
                            <Text fontWeight="bold" mb={2}>
                                Target role
                            </Text>

                            <input
                                value={targetRole}
                                onChange={(event) => setTargetRole(event.target.value)}
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
                            <Heading size="md">Analysis Summary</Heading>

                            <Text mt={3} color="gray.600">
                                Target role: {analysis.targetRole}
                            </Text>

                            {analysis.targetCompany && (
                                <Text color="gray.600">
                                    Target company: {analysis.targetCompany}
                                </Text>
                            )}
                        </Box>

                        <Box bg="white" p={7} rounded="2xl" shadow="sm">
                            <Heading size="md">Skills Found</Heading>

                            {analysis.foundSkills.length > 0 ? (
                                <List.Root mt={4}>
                                    {analysis.foundSkills.map((skill) => (
                                        <ListItem key={skill} color="green.600">
                                            {skill}
                                        </ListItem>
                                    ))}
                                </List.Root>
                            ) : (
                                <Text mt={3} color="gray.600">
                                    No matching skills were detected.
                                </Text>
                            )}
                        </Box>

                        <Box bg="white" p={7} rounded="2xl" shadow="sm">
                            <Heading size="md">Skills to Consider Adding</Heading>

                            {analysis.missingSkills.length > 0 ? (
                                <List.Root mt={4}>
                                    {analysis.missingSkills.map((skill) => (
                                        <ListItem key={skill} color="orange.600">
                                            {skill}
                                        </ListItem>
                                    ))}
                                </List.Root>
                            ) : (
                                <Text mt={3} color="green.600">
                                    Your resume covers the main detected skills.
                                </Text>
                            )}
                        </Box>

                        <Box bg="white" p={7} rounded="2xl" shadow="sm">
                            <Heading size="md">Suggestions</Heading>

                            <List.Root mt={4}>
                                {analysis.suggestions.map((suggestion) => (
                                    <ListItem key={suggestion} color="gray.700">
                                        {suggestion}
                                    </ListItem>
                                ))}
                            </List.Root>
                        </Box>
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