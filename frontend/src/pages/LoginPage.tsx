import { useState } from "react";
import {
    Box,
    Button,
    Container,
    Field,
    Heading,
    Input,
    Link,
    Stack,
    Text,
} from "@chakra-ui/react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { api } from "../services/api";

function LoginPage() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = async () => {
        setError("");

        try {
            const response = await api.post("/auth/login", {
                email,
                password,
            });

            const { token, user } = response.data.data;

            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));

            navigate("/dashboard");
        } catch (error: any) {
            setError(
                error.response?.data?.message || "Login failed. Please try again."
            );
        }
    };

    return (
        <Box minH="100vh" bg="gray.50" display="flex" alignItems="center">
            <Container maxW="md">
                <Box bg="white" p={{ base: 6, md: 10 }} rounded="2xl" shadow="lg">
                    <Stack gap={6}>
                        <Box textAlign="center">
                            <Heading size="xl" color="blue.700">
                                Welcome back
                            </Heading>

                            <Text mt={2} color="gray.600">
                                Login to continue your placement preparation.
                            </Text>
                        </Box>

                        <Stack gap={4}>
                            <Field.Root>
                                <Field.Label>Email</Field.Label>
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder="student@example.com"
                                />
                            </Field.Root>

                            <Field.Root>
                                <Field.Label>Password</Field.Label>
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    placeholder="Enter your password"
                                />
                            </Field.Root>
                        </Stack>

                        {error && (
                            <Text color="red.500" fontSize="sm">
                                {error}
                            </Text>
                        )}

                        <Button colorPalette="blue" size="lg" onClick={handleLogin}>
                            Login
                        </Button>

                        <Text textAlign="center" color="gray.600">
                            New student?{" "}
                            <Link asChild color="blue.600">
                                <RouterLink to="/register">Create an account</RouterLink>
                            </Link>
                        </Text>

                        <Button variant="outline" disabled>
                            Continue with Google
                        </Button>
                    </Stack>
                </Box>
            </Container>
        </Box>
    );
}

export default LoginPage;