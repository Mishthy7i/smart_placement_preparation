import {
    BarChart3,
    BookOpenCheck,
    ChevronDown,
    LayoutDashboard,
    LogOut,
    Menu,
    Sparkles,
    X,
} from "lucide-react";
import {
    Box,
    Button,
    Container,
    Flex,
    Heading,
    Icon,
    Stack,
    Text,
} from "@chakra-ui/react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function DashboardNavbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);

    const savedUser = localStorage.getItem("user");
    const user = savedUser ? JSON.parse(savedUser) : null;

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    };

    const navItems = [
        {
            label: "Overview",
            icon: LayoutDashboard,
            path: "/dashboard",
        },
        {
            label: "Practice",
            icon: BookOpenCheck,
            path: "/dashboard#topics",
        },
        {
            label: "Performance",
            icon: BarChart3,
            path: "/dashboard#analytics",
        },
    ];

    return (
        <Box
            position="sticky"
            top="0"
            zIndex="20"
            bg="rgba(255,255,255,0.88)"
            backdropFilter="blur(16px)"
            borderBottomWidth="1px"
            borderColor="gray.200"
        >
            <Container maxW="7xl" py={4}>
                <Flex justify="space-between" align="center">
                    <Flex
                        align="center"
                        gap={3}
                        cursor="pointer"
                        onClick={() => navigate("/dashboard")}
                    >
                        <Box
                            bg="linear-gradient(135deg, #3155d9, #7657e8)"
                            color="white"
                            p={2}
                            rounded="xl"
                        >
                            <Sparkles size={18} />
                        </Box>

                        <Box>
                            <Heading size="md" color="gray.800" letterSpacing="-0.04em">
                                SmartPrep
                            </Heading>

                            <Text fontSize="xs" color="gray.500">
                                Placement preparation portal
                            </Text>
                        </Box>
                    </Flex>

                    <Flex
                        display={{ base: "none", md: "flex" }}
                        align="center"
                        gap={2}
                    >
                        {navItems.map((item) => (
                            <Button
                                key={item.label}
                                variant={location.hash === item.path.split("#")[1] ||
                                    (item.path === "/dashboard" && location.pathname === "/dashboard")
                                    ? "subtle"
                                    : "ghost"}
                                colorPalette="blue"
                                onClick={() => {
                                    if (item.path.includes("#")) {
                                        document
                                            .getElementById(item.path.split("#")[1])
                                            ?.scrollIntoView({ behavior: "smooth" });
                                    } else {
                                        navigate(item.path);
                                    }
                                }}
                            >
                                <item.icon size={16} />
                                {item.label}
                            </Button>
                        ))}

                        <Box h="28px" w="1px" bg="gray.200" mx={3} />

                        <Flex align="center" gap={3} mr={3}>
                            <Flex
                                w="9"
                                h="9"
                                rounded="full"
                                bg="blue.100"
                                color="blue.700"
                                align="center"
                                justify="center"
                                fontWeight="bold"
                            >
                                {user?.name?.charAt(0)?.toUpperCase() || "S"}
                            </Flex>

                            <Box>
                                <Text fontWeight="600" fontSize="sm">
                                    {user?.name || "Student"}
                                </Text>

                                <Text color="gray.500" fontSize="xs">
                                    Student account
                                </Text>
                            </Box>
                        </Flex>

                        <Button variant="outline" colorPalette="red" onClick={logout}>
                            <LogOut size={16} />
                            Logout
                        </Button>
                    </Flex>

                    <Button
                        display={{ base: "flex", md: "none" }}
                        variant="ghost"
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Toggle dashboard navigation"
                    >
                        {menuOpen ? <X /> : <Menu />}
                    </Button>
                </Flex>

                {menuOpen && (
                    <Stack display={{ base: "flex", md: "none" }} gap={3} pt={5}>
                        {navItems.map((item) => (
                            <Button
                                key={item.label}
                                justifyContent="flex-start"
                                variant="ghost"
                                onClick={() => {
                                    setMenuOpen(false);

                                    if (item.path.includes("#")) {
                                        document
                                            .getElementById(item.path.split("#")[1])
                                            ?.scrollIntoView({ behavior: "smooth" });
                                    } else {
                                        navigate(item.path);
                                    }
                                }}
                            >
                                <item.icon size={16} />
                                {item.label}
                            </Button>
                        ))}

                        <Button
                            justifyContent="flex-start"
                            variant="ghost"
                            colorPalette="red"
                            onClick={logout}
                        >
                            <LogOut size={16} />
                            Logout
                        </Button>
                    </Stack>
                )}
            </Container>
        </Box>
    );
}

export default DashboardNavbar;