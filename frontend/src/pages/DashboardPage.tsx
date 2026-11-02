import {
    Box,
    Button,
    Container,
    Flex,
    Heading,
    SimpleGrid,
    Stack,
    Text,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

function DashboardPage() {
    const navigate = useNavigate();

    const savedUser = localStorage.getItem("user");
    const user = savedUser ? JSON.parse(savedUser) : null;

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    };

    return (
        <Box minH="100vh" bg="gray.50">
            <Box bg="white" borderBottomWidth="1px">
                <Container maxW="7xl" py={5}>
                    <Flex justify="space-between" align="center">
                        <Heading size="md" color="blue.700">
                            SmartPrep
                        </Heading>

                        <Button variant="outline" onClick={logout}>
                            Logout
                        </Button>
                    </Flex>
                </Container>
            </Box>

            <Container maxW="7xl" py={{ base: 8, md: 12 }}>
                <Stack gap={2} mb={10}>
                    <Text color="blue.600" fontWeight="bold">
                        STUDENT DASHBOARD
                    </Text>

                    <Heading color="gray.800">
                        Welcome, {user?.name || "Student"}!
                    </Heading>

                    <Text color="gray.600">
                        Continue your preparation and improve your placement readiness.
                    </Text>
                </Stack>

                <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
                    <DashboardCard
                        title="Topic Practice"
                        description="Practice questions topic by topic and strengthen your fundamentals."
                    />

                    <DashboardCard
                        title="Mock Tests"
                        description="Take timed assessments designed for placement preparation."
                    />

                    <DashboardCard
                        title="Performance"
                        description="Review your scores and identify areas that need improvement."
                    />
                </SimpleGrid>
            </Container>
        </Box>
    );
}

function DashboardCard({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <Box bg="white" p={7} rounded="2xl" shadow="sm" borderWidth="1px">
            <Stack gap={3}>
                <Heading size="md" color="gray.800">
                    {title}
                </Heading>

                <Text color="gray.600" lineHeight="1.6">
                    {description}
                </Text>

                <Button colorPalette="blue" variant="outline" alignSelf="start">
                    Coming soon
                </Button>
            </Stack>
        </Box>
    );
}

export default DashboardPage;