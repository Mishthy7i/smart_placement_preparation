import { useEffect, useState } from "react";
import {
    Box,
    Button,
    Container,
    Flex,
    Heading,
    RadioCard,
    Spinner,
    Stack,
    Text,
} from "@chakra-ui/react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import DashboardNavbar from "../components/DashboardNavbar";

type TestQuestion = {
    id: number;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
};

type TestDetails = {
    id: number;
    title: string;
    description: string;
    duration_minutes: number;
};

function MockTestPage() {
    const { testId } = useParams();
    const navigate = useNavigate();

    const [test, setTest] = useState<TestDetails | null>(null);
    const [questions, setQuestions] = useState<TestQuestion[]>([]);
    const [answers, setAnswers] = useState<
        Record<number, "A" | "B" | "C" | "D">
    >({});
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedOption, setSelectedOption] = useState("");
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [reviewMode, setReviewMode] = useState(false);
    const [error, setError] = useState("");
    const [startedAt, setStartedAt] = useState<string>(new Date().toISOString());

    useEffect(() => {
        const fetchTest = async () => {
            try {
                const token = localStorage.getItem("token");

                const response = await api.get(`/tests/${testId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                setTest(response.data.data.test);
                setQuestions(response.data.data.questions);
                setSecondsLeft(
                    response.data.data.test.duration_minutes * 60
                );
                setStartedAt(new Date().toISOString());
            } catch (error: any) {
                if (error.response?.status === 401) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    navigate("/login");
                } else {
                    setError("Unable to load mock test");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchTest();
    }, [testId, navigate]);

    const submitTest = async (
        finalAnswers: Record<number, "A" | "B" | "C" | "D">
    ) => {
        if (submitting || result) return;

        setSubmitting(true);

        try {
            const token = localStorage.getItem("token");

            const response = await api.post(
                `/tests/${testId}/submit`,
                {
                    answers: Object.entries(finalAnswers).map(
                        ([questionId, selectedOption]) => ({
                            questionId: Number(questionId),
                            selectedOption,
                        })
                    ),
                    startedAt,
                    durationSeconds: Math.max(
                        0,
                        Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
                    ),
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setResult(response.data.data);
        } catch {
            setError("Unable to submit mock test");
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        if (loading || result || secondsLeft <= 0) return;

        const timer = window.setInterval(() => {
            setSecondsLeft((previous) => {
                if (previous <= 1) {
                    window.clearInterval(timer);
                    void submitTest(answers);
                    return 0;
                }

                return previous - 1;
            });
        }, 1000);

        return () => window.clearInterval(timer);
    }, [loading, result, secondsLeft, answers]);

    if (loading) {
        return (
            <Flex minH="100vh" align="center" justify="center">
                <Spinner size="xl" color="blue.500" />
            </Flex>
        );
    }

    if (error) {
        return (
            <Container maxW="container.md" py={12}>
                <Text color="red.500">{error}</Text>

                <Button mt={4} onClick={() => navigate("/tests")}>
                    Back to Mock Tests
                </Button>
            </Container>
        );
    }

    if (result) {
        return (
            <Box minH="100vh" bg="gray.50">
                <DashboardNavbar />
                <Container maxW="container.md" py={{ base: 10, md: 16 }}>
                <Box bg="white" p={{ base: 6, md: 10 }} rounded="2xl" shadow="sm">
                    <Stack gap={5} textAlign="center">
                        <Text color="green.600" fontWeight="bold">
                            MOCK TEST COMPLETED
                        </Text>

                        <Heading>{test?.title}</Heading>

                        <Box bg="blue.50" p={6} rounded="xl">
                            <Text color="gray.600">Your Score</Text>

                            <Heading color="blue.700" fontSize="5xl" mt={2}>
                                {result.percentage}%
                            </Heading>

                            <Text mt={2}>
                                {result.score} out of {result.totalQuestions} correct
                            </Text>
                        </Box>

                        <Button
                            colorPalette="blue"
                            onClick={() => navigate("/dashboard")}
                        >
                            Back to Dashboard
                        </Button>
                    </Stack>
                </Box>
                </Container>
            </Box>
        );
    }

    const question = questions[currentQuestion];

    if (!question) {
        return (
            <Container maxW="container.md" py={12}>
                <Text>No questions are available for this test.</Text>
            </Container>
        );
    }

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;

    const options = [
        { value: "A", label: question.option_a },
        { value: "B", label: question.option_b },
        { value: "C", label: question.option_c },
        { value: "D", label: question.option_d },
    ];

    const handleNext = () => {
        if (!selectedOption) return;

        const updatedAnswers = {
            ...answers,
            [question.id]: selectedOption as "A" | "B" | "C" | "D",
        };

        setAnswers(updatedAnswers);

        if (currentQuestion < questions.length - 1) {
            const nextQuestion = questions[currentQuestion + 1];

            setCurrentQuestion((previous) => previous + 1);
            setSelectedOption(updatedAnswers[nextQuestion.id] || "");
        } else {
            setReviewMode(true);
        }
    };

    const unansweredCount = questions.length - Object.keys(answers).length;

    return (
        <Box minH="100vh" bg="#eef2f7">
            <Box bg="#111827" color="white" borderBottomWidth="1px" borderColor="gray.700">
                <Container maxW="container.xl" py={4}>
                    <Flex justify="space-between" align="center" gap={5}>
                        <Box>
                            <Text fontSize="xs" color="blue.200" fontWeight="bold" letterSpacing="widest">
                                SMARTPREP · MOCK ASSESSMENT
                            </Text>
                            <Heading size="md" mt={1}>{test?.title}</Heading>
                        </Box>
                        <Flex align="center" gap={3}>
                            <Text display={{ base: "none", md: "block" }} color="gray.300" fontSize="sm">Time remaining</Text>
                            <Box px={5} py={3} rounded="lg" bg={secondsLeft <= 60 ? "red.600" : "gray.700"} fontWeight="bold" fontFamily="mono" fontSize="lg">
                                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                            </Box>
                        </Flex>
                    </Flex>
                </Container>
            </Box>

            <Container maxW="container.xl" py={{ base: 5, md: 8 }}>
                <Flex direction={{ base: "column", lg: "row" }} gap={6} align="start">
                    <Box flex="1" width="full">
                        <Box bg="white" rounded="xl" borderWidth="1px" borderColor="gray.200" p={{ base: 5, md: 8 }} shadow="sm">
                            <Flex justify="space-between" align="center" mb={6}>
                                <Box>
                                    <Text color="gray.500" fontSize="sm" fontWeight="bold">QUESTION {currentQuestion + 1} OF {questions.length}</Text>
                                    <Text mt={1} color="gray.500" fontSize="sm">Choose one answer. You can revisit questions before submitting.</Text>
                                </Box>
                                <Text color="gray.500" fontSize="sm">{Math.round(((currentQuestion + 1) / questions.length) * 100)}%</Text>
                            </Flex>
                            <Box h="2" bg="gray.100" rounded="full" mb={8}>
                                <Box h="full" bg="blue.600" rounded="full" width={`${((currentQuestion + 1) / questions.length) * 100}%`} />
                            </Box>
                            <Text color="gray.500" fontSize="sm">Difficulty: {question.difficulty}</Text>
                            <Heading size="lg" lineHeight="1.45" mt={4}>{question.question_text}</Heading>
                            <RadioCard.Root mt={8} value={selectedOption} onValueChange={(details) => setSelectedOption(details.value)}>
                                <Stack gap={3}>
                                    {options.map((option) => (
                                        <RadioCard.Item key={option.value} value={option.value}>
                                            <RadioCard.ItemHiddenInput />
                                            <RadioCard.ItemControl>
                                                <RadioCard.ItemContent>
                                                    <RadioCard.ItemText><Text fontWeight="semibold">{option.value}. {option.label}</Text></RadioCard.ItemText>
                                                </RadioCard.ItemContent>
                                                <RadioCard.ItemIndicator />
                                            </RadioCard.ItemControl>
                                        </RadioCard.Item>
                                    ))}
                                </Stack>
                            </RadioCard.Root>
                            <Flex mt={8} justify="space-between" gap={3}>
                                <Button variant="outline" disabled={currentQuestion === 0} onClick={() => { const index = currentQuestion - 1; setCurrentQuestion(index); setSelectedOption(answers[questions[index].id] || ""); }}>
                                    Previous
                                </Button>
                                <Button colorPalette="blue" disabled={!selectedOption || submitting} onClick={handleNext}>
                                    {currentQuestion === questions.length - 1 ? "Review and Submit" : "Save and Continue"}
                                </Button>
                            </Flex>
                            {reviewMode && (
                                <Box mt={6} p={5} rounded="lg" bg="blue.50" borderWidth="1px" borderColor="blue.200">
                                    <Heading size="sm">Final review</Heading>
                                    <Text mt={2} color="gray.700">{unansweredCount > 0 ? `${unansweredCount} question(s) are unanswered and will be marked incorrect.` : "All questions have been answered."}</Text>
                                    <Flex mt={4} gap={3} wrap="wrap">
                                        <Button variant="outline" onClick={() => setReviewMode(false)}>Continue Reviewing</Button>
                                        <Button colorPalette="blue" disabled={submitting} onClick={() => void submitTest(answers)}>{submitting ? "Submitting..." : "Submit Test"}</Button>
                                    </Flex>
                                </Box>
                            )}
                        </Box>
                    </Box>

                    <Box width={{ base: "full", lg: "280px" }} bg="white" rounded="xl" borderWidth="1px" borderColor="gray.200" p={5} shadow="sm" position={{ lg: "sticky" }} top={{ lg: "24px" }}>
                        <Heading size="sm">Test overview</Heading>
                        <Text mt={2} color="gray.600" fontSize="sm">{test?.description}</Text>
                        <Flex mt={5} justify="space-between" fontSize="sm"><Text color="gray.500">Answered</Text><Text fontWeight="bold">{Object.keys(answers).length}/{questions.length}</Text></Flex>
                        <Box mt={4} h="2" bg="gray.100" rounded="full"><Box h="full" bg="green.500" rounded="full" width={`${(Object.keys(answers).length / questions.length) * 100}%`} /></Box>
                        <Text mt={7} fontWeight="bold" fontSize="sm">Question palette</Text>
                        <Flex mt={3} gap={2} wrap="wrap">
                            {questions.map((item, index) => (
                                <Button key={item.id} size="sm" minW="10" variant={index === currentQuestion ? "solid" : "outline"} colorPalette={answers[item.id] ? "green" : "gray"} onClick={() => { setCurrentQuestion(index); setSelectedOption(answers[item.id] || ""); }}>{index + 1}</Button>
                            ))}
                        </Flex>
                        <Text mt={5} color="gray.500" fontSize="xs">Green numbers are answered. Outlined numbers still need review.</Text>
                    </Box>
                </Flex>
            </Container>
        </Box>
    );
}

export default MockTestPage;
