import React, { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Modal,
    FlatList,
    RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, updateDoc, arrayRemove, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../../firebase";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../../src/hoooks/useAuth"; // Import the useAuth hook

const GroupPage = () => {
    const { user, loading } = useAuth(); // Use the useAuth hook to get the current user
    const params = useLocalSearchParams();
    const id = params.id as string;
    const [groupDetails, setGroupDetails] = useState<any>(null);
    const [loadingGroup, setLoadingGroup] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [membersDetails, setMembersDetails] = useState<any[]>([]);
    const [tasksDetails, setTasksDetails] = useState<any[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedTab, setSelectedTab] = useState("All Tasks");
    const router = useRouter(); // Add the useRouter hook

    const fetchGroupDetails = async () => {
        try {
            if (!id) {
                throw new Error("Group ID is required");
            }

            const groupDocRef = doc(db, "Groups", id);
            const groupDoc = await getDoc(groupDocRef);

            if (groupDoc.exists()) {
                const groupData = groupDoc.data();
                setGroupDetails({
                    ...groupData,
                    description: groupData.description || "",
                });

                // Fetch members' details
                if (groupData.members && groupData.members.length > 0) {
                    const userUids = groupData.members.map((member: any) => member.uid);
                    fetchMembersDetails(userUids);
                }

                // Fetch tasks' details
                fetchTasksDetails(id);
            }
        } catch (error) {
            console.error("Error fetching group details:", error);
        } finally {
            setLoadingGroup(false);
            setRefreshing(false);
        }
    };

    const fetchMembersDetails = async (userUids: string[]) => {
        try {
            const members = [];
            for (const uid of userUids) {
                const userDocRef = doc(db, "Users", uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    members.push({ ...userDoc.data(), uid });
                } else {
                    console.error(`No user document found for UID: ${uid}`);
                }
            }
            setMembersDetails(members);
        } catch (error) {
            console.error("Error fetching members details:", error);
        }
    };

    const fetchTasksDetails = async (groupId: string) => {
        try {
            const tasksQuery = query(collection(db, "Tasks"), where("group_id", "==", groupId));
            const tasksSnapshot = await getDocs(tasksQuery);
            const tasks = tasksSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setTasksDetails(tasks);
        } catch (error) {
            console.error("Error fetching tasks details:", error);
        }
    };

    const handleKickOut = async (memberId: string) => {
        try {
            const groupDocRef = doc(db, "Groups", id);
            await updateDoc(groupDocRef, {
                members: arrayRemove({ uid: memberId }),
            });
            setMembersDetails((prev) =>
                prev.filter((member) => member.uid !== memberId)
            );
            Alert.alert("Success", "Member has been removed.");
        } catch (error) {
            console.error("Error removing member:", error);
            Alert.alert("Error", "Failed to remove member.");
        }
    };

    const handleLeaveGroup = async () => {
        try {
            if (!id) {
                throw new Error("Group ID is required");
            }

            if (!user?.uid) {
                throw new Error("User ID is required");
            }

            const groupDocRef = doc(db, "Groups", id);
            const userDocRef = doc(db, "Users", user.uid);

            const groupDoc = await getDoc(groupDocRef);
            if (!groupDoc.exists()) {
                Alert.alert("Error", "Group not found.");
                return;
            }

            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
                Alert.alert("Error", "User not found.");
                return;
            }

            const memberToRemove = {
                uid: user.uid,
                email: userDoc.data()?.email || "",
                name: userDoc.data()?.name || "Unknown",
                role: "member",
            };

            const updatedMembers = groupDoc
                .data()
                ?.members.filter((member: any) => member.uid !== user.uid);
            await updateDoc(groupDocRef, {
                ...groupDoc.data(),
                members: updatedMembers,
            });

            await updateDoc(userDocRef, {
                linked_groups: arrayRemove(id),
            });

            Alert.alert("Success", "You have left the group.");
            router.replace("/home/groups"); // Navigate back to the groups page
        } catch (error) {
            console.error("Error leaving group:", error);
            Alert.alert(
                "Error",
                "Failed to leave the group. Please try again later."
            );
        }
    };

    useEffect(() => {
        if (!loading) {
            fetchGroupDetails();
        }
    }, [id, loading]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchGroupDetails();
    }, []);

    const filterTasks = (tasks: any[], status: string) => {
        const filteredTasks = tasks.filter(task => task.status !== "Deleted");
        switch (status) {
            case "Completed":
                return filteredTasks.filter(task => task.status === "Completed");
            case "Pending":
                return filteredTasks.filter(task => task.status === "Pending");
            case "My Tasks":
                return filteredTasks.filter(task => task.current_assignee_id === user?.uid);
            default:
                return filteredTasks;
        }
    };

    const renderTaskItem = ({ item }: { item: any }) => {
        const priorityColors = {
          High: "#d9534f",
          Medium: "#f0ad4e",
          Low: "#5cb85c",
        };
      
        // Get the current assignee's details
        const currentAssignee = item.rotation_members?.find(
          (member: any) => member.uid === item.current_assignee_id
        );
      
        return (
          <TouchableOpacity
            style={[styles.taskCard, { backgroundColor: priorityColors[item.priority as keyof typeof priorityColors] }]}
            onPress={() => router.push(`/home/groups/TaskCard?id=${item.id}`)}
          >
            {/* Assignee Section */}
            <View style={styles.assigneeContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {currentAssignee?.name?.[0] || "?"}
                </Text>
              </View>
            </View>
      
            {/* Task Details Section */}
            <View style={styles.taskDetails}>
              <Text style={[styles.taskTitle, { color: "#fff" }]}>{item.title}</Text>
              <Text style={[styles.taskDescription, { color: "#fff" }]}>{item.description}</Text>
              <Text style={[styles.taskDueDate, { color: "#fff" }]}>
                Due: {new Date(item.due_date.seconds * 1000).toLocaleString()}
              </Text>
              <Text style={[styles.taskStatus, { color: "#fff" }]}>{item.status}</Text>
            </View>
          </TouchableOpacity>
        );
      };

    if (loading || loadingGroup) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Loading Group Details...</Text>
            </View>
        );
    }

    if (!groupDetails) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Group not found</Text>
            </View>
        );
    }

    const isAdmin = groupDetails.members.some(
        (member: any) => member.uid === user?.uid && member.role === "admin"
    );

    return (
        <View style={styles.container}>
            {/* Top Header Section */}
            <View style={styles.header}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                        style={[
                            styles.iconContainer,
                            {
                                backgroundColor:
                                    "#" + ((Math.random() * 0xffffff) << 0).toString(16),
                            },
                        ]}
                    >
                        <Text style={styles.emoji}>{groupDetails.icon}</Text>
                    </View>
                    <View style={{ marginLeft: 10 }}>
                        <Text style={styles.title}>{groupDetails.name}</Text>
                        <Text style={styles.subtitle}> 
                            {membersDetails.length} people are in the group
                        </Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(true)}>
                    <Ionicons
                        name="information-circle-outline"
                        size={30}
                        color="#007bff"
                    />
                </TouchableOpacity>
            </View>

            {/* Modal for Group Info */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{groupDetails.name}</Text>
                        <Text style={styles.modalSubtitle}>Members:</Text>
                        {membersDetails.map((member) => (
                            <Text key={member.uid} style={styles.modalMember}>
                                {member.name || "Unknown"}
                            </Text>
                        ))}
                        <TouchableOpacity
                            style={styles.modalLeaveButton}
                            onPress={handleLeaveGroup}
                        >
                            <Ionicons name="exit-outline" size={20} color="#fff" />
                            <Text style={styles.modalLeaveText}>Exit Group</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Tabs for Task Views */}
            <View style={styles.tabsContainer}>
                {["All Tasks", "Completed", "Pending", "My Tasks"].map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, selectedTab === tab && styles.activeTab]}
                        onPress={() => setSelectedTab(tab)}
                    >
                        <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <FlatList
                style={{ marginBottom: 30 }}
                data={filterTasks(tasksDetails, selectedTab)}
                keyExtractor={(item) => item.id}
                renderItem={renderTaskItem}
                refreshing={refreshing}
                onRefresh={onRefresh}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            />

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.createTaskButton}
                    onPress={() => router.push(`/home/groups/CreateTask?id=${id}`)}
                >
                    <Text style={styles.createTaskButtonText}>+ Create Task</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9fa",
        padding: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorText: {
        textAlign: "center",
        fontSize: 16,
        color: "#d9534f",
    },
    header: {
        marginBottom: 20,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#333",
    },
    subtitle: {
        fontSize: 16,
        color: "#666",
        marginTop: 5,
    },
    emoji: { fontSize: 30 },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalSubtitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 10,
    },
    modalMember: {
        fontSize: 16,
        marginBottom: 5,
    },
    modalLeaveButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#d9534f",
        padding: 10,
        borderRadius: 5,
        marginTop: 20,
    },
    modalLeaveText: {
        color: "#fff",
        fontWeight: "bold",
        marginLeft: 5,
    },
    footer: {
        height: 50,
        justifyContent: "center",
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        padding: 5,
    },
    createTaskButton: {
        backgroundColor: "#007bff",
        padding: 10,
        borderRadius: 5,
        alignItems: "center",
    },
    createTaskButtonText: {
        color: "#fff",
        fontWeight: "bold",
    },
    modalContent: {
        width: "90%",
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 10,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 20,
        color: "#333",
    },
    modalCloseButton: {
        marginTop: 15,
        alignItems: "center",
    },
    modalCloseText: {
        color: "#007bff",
        fontWeight: "bold",
        fontSize: 16,
    },
    tabsContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginBottom: 10,
    },
    tab: {
        padding: 10,
        borderRadius: 5,
    },
    activeTab: {
        backgroundColor: "#007bff",
    },
    tabText: {
        color: "#007bff",
    },
    activeTabText: {
        color: "#fff",
    },
    taskCard: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        alignItems: "center",
    },
    assigneeContainer: {
        marginRight: 15,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#007bff",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 20,
    },
    taskDetails: {
        flex: 1,
    },
    taskTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 5,
    },
    taskDescription: {
        fontSize: 14,
        color: "#666",
        marginBottom: 5,
    },
    taskPriority: {
        fontSize: 14,
        marginBottom: 5,
    },
    taskDueDate: {
        fontSize: 14,
        color: "#666",
        marginBottom: 5,
    },
    taskStatus: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#007bff",
    },
});

export default GroupPage;
