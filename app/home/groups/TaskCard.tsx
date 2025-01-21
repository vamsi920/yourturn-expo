import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/hoooks/useAuth'; // Ensure you are using the proper auth hook

const TaskCard = () => {
    const params = useLocalSearchParams();
    const taskId = params.id as string;
    const { user } = useAuth(); // Access authenticated user from context
    const router = useRouter(); // Get the router object
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
            const nextIndex = (taskDetails.next_rotation_index + 1) % taskDetails.rotation_members.length;
            const nextAssignee = taskDetails.rotation_members[previousNextRotationIndex];

            // Calculate the new due date based on recurrence type
            let newDueDate = new Date(taskDetails.due_date.seconds * 1000);
            if (taskDetails.recurrence) {
                switch (taskDetails.recurrence.type) {
                    case 'Daily':
                        newDueDate.setDate(newDueDate.getDate() + 1);
                        break;
                        case 'Weekly':
                            const daysOfWeek = taskDetails.recurrence.days_of_week.map((day: string) =>
                                ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(day)
                            );
                            const currentDayIndex = newDueDate.getDay();
                        
                            // Sort days to ensure proper sequence
                            const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
                        
                            // Find the next recurrence day
                            const nextDayIndex = sortedDays.find(day => day > currentDayIndex);
                            const daysToAdd =
                                nextDayIndex !== undefined
                                    ? nextDayIndex - currentDayIndex
                                    : 7 - currentDayIndex + sortedDays[0];
                        
                            // Safely adjust the date
                            const tempDate = new Date(newDueDate);
                            tempDate.setDate(tempDate.getDate() + daysToAdd);
                        
                            // Validate the new date and handle any potential overflow
                            if (isNaN(tempDate.getTime())) {
                                throw new Error("Calculated date is invalid");
                            }
                        
                            newDueDate = tempDate; // Update the due date safely
                            break;
                    case 'Monthly':
                        if (taskDetails.recurrence.monthly_date) {
                            newDueDate.setMonth(newDueDate.getMonth() + 1);
                            const daysInMonth = new Date(newDueDate.getFullYear(), newDueDate.getMonth() + 1, 0).getDate();
                            newDueDate.setDate(Math.min(parseInt(taskDetails.recurrence.monthly_date, 10), daysInMonth));
                        }
                        break;
                    default:
                        break;
                }
                const [hours, minutes] = taskDetails.recurrence.time_of_day.split(':');
                newDueDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
            }

            await updateDoc(doc(db, "Tasks", taskId), {
                completion_history: arrayUnion({
                    user_id: user?.uid,
                    completed_at: new Date(),
                }),
                status: 'Pending',
                updated_at: new Date(),
                next_rotation_index: nextIndex,
                current_assignee_id: nextAssignee.uid,
                due_date: newDueDate,
            });

            // Update local state
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
                status: 'Pending',
                updated_at: new Date(),
                due_date: {
                    seconds: Math.floor(newDueDate.getTime() / 1000),
                    nanoseconds: (newDueDate.getTime() % 1000) * 1e6, // Convert milliseconds to nanoseconds
                },
            }));
            // console.log(taskDetails.due_date)

        } catch (error) {
            console.error("Error updating task:", error);
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
            case 'High':
                return '#d9534f';
            case 'Medium':
                return '#f0ad4e';
            case 'Low':
                return '#5cb85c';
            default:
                return '#007bff';
        }
    };

    const onDeleteTask = async () => {
        try {
            await updateDoc(doc(db, "Tasks", taskId), {
                status: 'Deleted',
                updated_at: new Date(),
            });

            // Optionally, you can navigate back or show a success message
            console.log("Task deleted successfully");
            router.back(); // Navigate back to the previous page
        } catch (error) {
            console.error("Error deleting task:", error);
        }
    };
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>{taskDetails.title}</Text>
                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(taskDetails.priority) }]}>
                    <Text style={styles.priorityText}>{taskDetails.priority}</Text>
                </View>
            </View>

            {/* Body */}
            <ScrollView style={styles.body}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Overview</Text>
                    <Text style={styles.description}>{taskDetails.description}</Text>
                </View>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Details</Text>
                    <Text style={styles.dueDate}>
                        Due: {new Date(taskDetails.due_date.seconds * 1000).toLocaleString()}
                    </Text>
                    {/* <Text style={styles.status}>Status: {taskDetails.status}</Text> */}
                </View>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Assignee</Text>
                    <Text style={styles.assignee}>{taskDetails.assignee}</Text>
                <Text style={styles.sectionTitle}>Current Assignee</Text>
                <Text style={styles.assignee}>
                    {taskDetails.rotation_members.find((member: any) => member.uid === taskDetails.current_assignee_id)?.name}
                </Text>
                <Text style={styles.sectionTitle}>Next Assignee</Text>
                <Text style={styles.assignee}>
                    {taskDetails.rotation_members[taskDetails.next_rotation_index]?.name}
                </Text>
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                {user?.uid === taskDetails.current_assignee_id && (
                    <TouchableOpacity style={styles.actionButton} onPress={onPressDone}>
                        <Text style={styles.actionButtonText}>Mark as Done</Text>
                    </TouchableOpacity>
                )}
                {/* <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity> */}
                <TouchableOpacity style={styles.actionButton} onPress={onDeleteTask}>
                    <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        margin: 10,
        backgroundColor: '#fff',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#d9534f',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    priorityBadge: {
        borderRadius: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    priorityText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    body: {
        flex: 1,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    description: {
        fontSize: 14,
        color: '#666',
    },
    dueDate: {
        fontSize: 14,
        color: '#666',
        marginVertical: 10,
    },
    status: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#007bff',
    },
    assignee: {
        fontSize: 14,
        color: '#666',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 20,
    },
    actionButton: {
        backgroundColor: '#007bff',
        padding: 10,
        borderRadius: 5,
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default TaskCard;