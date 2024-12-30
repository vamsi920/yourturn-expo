import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, updateDoc, arrayRemove } from "firebase/firestore";
import { db } from "../../../firebase";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../src/hoooks/useAuth"; // Import the useAuth hook

const GroupPage = () => {
  const { user, loading } = useAuth(); // Use the useAuth hook to get the current user
  const params = useLocalSearchParams();
  const id = params.id as string;
  const [groupDetails, setGroupDetails] = useState<any>(null);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [membersDetails, setMembersDetails] = useState<any[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const router = useRouter(); // Add the useRouter hook

  const [taskDescription, setTaskDescription] = useState("");
  const [recurrenceType, setRecurrenceType] = useState("Daily");
  const [dayOfWeek, setDayOfWeek] = useState("Monday");
  const [dayOfMonth, setDayOfMonth] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [taskTitle, setTaskTitle] = useState("");

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

  const handleCreateTask = () => {
    // Implement task creation logic here
    Alert.alert("Task Created", `Title: ${taskTitle}`);
  };

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
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.createTaskButton}
          onPress={() => router.replace(`/home/groups/CreateTask?id=${id}`)}
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
  membersSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 10,
    marginBottom: 10,
    borderRadius: 10,
    elevation: 2,
  },
  memberDetails: {
    flex: 1,
    marginLeft: 10,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  memberRole: {
    fontSize: 12,
    color: "#999",
  },
  emoji: { fontSize: 30 },
  toggleButton: {
    fontSize: 16,
    color: "#007bff",
    textDecorationLine: "underline",
    marginTop: 10,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  leaveButton: {
    padding: 5,
    backgroundColor: "#f0ad4e",
    borderRadius: 5,
  },
  leaveText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  kickOutButton: {
    padding: 5,
    backgroundColor: "#d9534f",
    borderRadius: 5,
  },
  kickOutText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
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
    width: "90%", // Adjust width for better spacing
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000", // Add subtle shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5, // For Android shadow
  },
  input: {
    height: 50, // Uniform height
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15, // Add consistent spacing
    width: "100%", // Full width
    backgroundColor: "#f9f9f9", // Light background for better UX
    color: "#333", // Darker text for better contrast
  },
  modalButton: {
    backgroundColor: "#007bff", // Blue button
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    width: "100%", // Full width button
    marginTop: 10, // Space from inputs
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16, // Adjust for better readability
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20, // Space below title
    color: "#333", // Darker color for better contrast
  },
  modalCloseButton: {
    marginTop: 15, // Space above close button
    alignItems: "center",
  },
  modalCloseText: {
    color: "#007bff",
    fontWeight: "bold",
    fontSize: 16,
  },
  picker: {
    height: 50,
    width: "100%",
    marginBottom: 15,
  },
});

export default GroupPage;
