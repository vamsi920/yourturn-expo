import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../../firebase";
import { ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../../src/hoooks/useAuth";

const TaskCard = () => {
  const params = useLocalSearchParams();
  const taskId = params.id as string;
  const { user } = useAuth();
  const router = useRouter();
  const [taskDetails, setTaskDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchTaskDetails = async () => {
    try {
      const taskDocRef = doc(db, "Tasks", taskId);
      const taskDoc = await getDoc(taskDocRef);

      if (taskDoc.exists()) {
        setTaskDetails(taskDoc.data());
      } else {
        console.error("No task found with the given ID");
      }
    } catch (error) {
      console.error("Error fetching task details:", error);
    } finally {
      setLoading(false);
    }
  };

  const onPressDone = async () => {
    if (!taskDetails) return;

    try {
      const previousNextRotationIndex = taskDetails.next_rotation_index;
      const nextIndex =
        (taskDetails.next_rotation_index + 1) %
        taskDetails.rotation_members.length;
      const nextAssignee =
        taskDetails.rotation_members[previousNextRotationIndex];

      let newDueDate = new Date(taskDetails.due_date.seconds * 1000);
      if (taskDetails.recurrence) {
        switch (taskDetails.recurrence.type) {
          case "Weekly":
            newDueDate.setDate(newDueDate.getDate() + 7);
            break;
          default:
            break;
        }
        const [hours, minutes] = taskDetails.recurrence.time_of_day.split(":");
        newDueDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      }

      await updateDoc(doc(db, "Tasks", taskId), {
        completion_history: arrayUnion({
          user_id: user?.uid,
          completed_at: new Date(),
        }),
        status: "Pending",
        updated_at: new Date(),
        next_rotation_index: nextIndex,
        current_assignee_id: nextAssignee.uid,
        due_date: newDueDate,
      });

      setTaskDetails((prevDetails: any) => ({
        ...prevDetails,
        next_rotation_index: nextIndex,
        current_assignee_id: nextAssignee.uid,
        completion_history: [
          ...prevDetails.completion_history,
          {
            user_id: user?.uid,
            completed_at: new Date(),
          },
        ],
        status: "Pending",
        updated_at: new Date(),
        due_date: {
          seconds: Math.floor(newDueDate.getTime() / 1000),
          nanoseconds: (newDueDate.getTime() % 1000) * 1e6,
        },
      }));
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const onDeleteTask = async () => {
    try {
      await updateDoc(doc(db, "Tasks", taskId), {
        status: "Deleted",
        updated_at: new Date(),
      });
      router.back();
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchTaskDetails();
    }
  }, [taskId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  if (!taskDetails) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Task not found</Text>
      </View>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "#d9534f";
      case "Medium":
        return "#f0ad4e";
      case "Low":
        return "#5cb85c";
      default:
        return "#007bff";
    }
  };

  const getRandomColor = () => {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  const InitialAvatar = ({ name }: { name: string }) => {
    const initial = name.charAt(0).toUpperCase();
    const backgroundColor = getRandomColor();
    return (
      <View style={[styles.avatar, { backgroundColor }]}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{taskDetails.title}</Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                taskDetails.status === "Active" ? "#28a745" : "#007bff",
            },
          ]}
        >
          <Text style={styles.statusText}>{taskDetails.status}</Text>
        </View>
      </View>

      {/* Body */}
      <ScrollView style={styles.body}>
        <View style={styles.box}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Assignee</Text>
            <View style={styles.assigneeRow}>
                <InitialAvatar
                    name={
                        taskDetails.rotation_members.find(
                            (member: any) =>
                                member.uid === taskDetails.current_assignee_id
                        )?.name || "Unknown"
                    }
                />
                <View style={{ flex: 1 }}>
                    <Text style={styles.assigneeName}>
                        {taskDetails.rotation_members.find(
                            (member: any) =>
                                member.uid === taskDetails.current_assignee_id
                        )?.name || "Unknown"}
                    </Text>
                    <Text style={styles.dueDate}>
                        Due in{" "}
                        {typeof taskDetails.due_date?.seconds === "number"
                            ? Math.ceil(
                                    (new Date(taskDetails.due_date.seconds * 1000).getTime() -
                                        new Date().getTime()) /
                                        (1000 * 60 * 60 * 24)
                                )
                            : "N/A"}{" "}
                        days
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.markDoneButton}
                    onPress={onPressDone}
                >
                    <Text style={styles.markDoneText}>Mark Done</Text>
                </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
        <View style={styles.box}>
          <Text style={styles.sectionTitle}>Rotation Schedule</Text>
          {taskDetails.rotation_members.map((member: any, index: number) => (
            <View key={index} style={styles.rotationRow}>
              <InitialAvatar name={member.name} />
              <Text style={styles.rotationName}>
                {member.name}{" "}
                {index === taskDetails.next_rotation_index
                  ? "Next in rotation"
                  : index ===
                    (taskDetails.next_rotation_index + 1) %
                      taskDetails.rotation_members.length
                  ? "Following week"
                  : ""}
              </Text>
            </View>
          ))}
          </View>
        </View>

        <View style={styles.section}>
        <View style={styles.box}>
          <Text style={styles.sectionTitle}>Task Details</Text>
          <Text style={styles.taskDetail}>Weekly on Monday 9:00 AM</Text>
          <Text style={styles.taskDetail}>1 day before due date</Text>
          <Text style={styles.description}>{taskDetails.description}</Text>
        </View>
        </View>

        <View style={styles.section}>
        <View style={styles.box}>
          <Text style={styles.sectionTitle}>Task History</Text>
          {taskDetails.completion_history.map((history: any, index: number) => (
            <View key={index} style={styles.historyRow}>
              <InitialAvatar
                name={
                  taskDetails.rotation_members.find(
                    (member: any) => member.uid === history.user_id
                  )?.name || "Unknown"
                }
              />
              <Text style={styles.historyName}>
                {taskDetails.rotation_members.find(
                  (member: any) => member.uid === history.user_id
                )?.name || "Unknown"}{" "}
                Completed •{" "}
                {new Date(
                  history.completed_at.seconds * 1000
                ).toLocaleDateString()}
              </Text>
            </View>
          ))}
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
       
        <TouchableOpacity
          style={styles.footerButton}
          onPress={() => console.log("Edit")}
        >
          <Text style={styles.footerButtonText}>Edit Task</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 15,
        backgroundColor: "#f5f5f5",
        borderRadius: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
        borderWidth: 1,
        borderColor: "#ddd",
    },
    box: {
        padding: 15,
        backgroundColor: "#fff",
        borderRadius: 10,
        marginBottom: 15,
        borderWidth: 0.5,
        borderColor: "#ddd",
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
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
        paddingHorizontal: 5,
    },
    title: {
        fontSize: 18,
        fontWeight: "bold",
    },
    statusBadge: {
        borderRadius: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    statusText: {
        color: "#fff",
        fontWeight: "bold",
    },
    body: {
        flex: 1,
    },
    section: {
        paddingHorizontal: 5,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 10,
        color: "#333",
    },
    assigneeRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    avatarText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
    assigneeName: {
        fontSize: 16,
        color: "#333",
    },
    dueDate: {
        fontSize: 14,
        color: "#666",
    },
    markDoneButton: {
        backgroundColor: "#007bff",
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 5,
        marginLeft: "auto",
    },
    markDoneText: {
        color: "#fff",
        fontWeight: "bold",
    },
    rotationRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 5,
    },
    rotationName: {
        fontSize: 14,
        color: "#666",
        marginLeft: 10,
    },
    taskDetail: {
        fontSize: 14,
        color: "#666",
        marginBottom: 5,
    },
    description: {
        fontSize: 14,
        color: "#666",
    },
    historyRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 5,
    },
    historyName: {
        fontSize: 14,
        color: "#666",
        marginLeft: 10,
    },
    footer: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: "#eee",
    },
    footerButton: {
        backgroundColor: "#007bff",
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 5,
    },
    footerButtonText: {
        color: "#fff",
        fontWeight: "bold",
    },
});

export default TaskCard;
