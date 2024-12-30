import React, { useEffect, useState } from "react";
import {
    View,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import { Input, Button, Text, CheckBox, Divider } from "react-native-elements";
import {
    doc,
    getDoc,
    setDoc,
    collection,
    addDoc,
    Timestamp,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { useLocalSearchParams, useRouter } from "expo-router";
import { auth } from "@/src/lib/firebase";
import { useAuth } from "../../../src/hoooks/useAuth"; // Ensure you are using the proper auth hook

const CreateTask = () => {
    const params = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const id = params.id as string; // Group ID
    const [groupDetails, setGroupDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        taskName: "",
        description: "",
        category: "",
        priority: "Medium",
        recurrence: {
            type: "",
            days_of_week: [] as string[],
            monthly_date: "",
            time_of_day: "",
        },
        rotation_members: [] as { uid: string; name: string }[],
        recurrenceType: "",
    });

    const fetchGroupDetails = async () => {
        try {
            if (!id) throw new Error("Group ID is required");

            const groupDocRef = doc(db, "Groups", id);
            const groupDoc = await getDoc(groupDocRef);

            if (groupDoc.exists()) {
                const groupData = groupDoc.data();
                setGroupDetails(groupData);

                // Fetch members' details
                if (groupData.members && groupData.members.length > 0) {
                    const userUids = groupData.members.map((member: any) => member.uid);
                    fetchMembersDetails(userUids);
                }
            } else {
                console.error("Group not found");
            }
        } catch (error) {
            console.error("Error fetching group details:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMembersDetails = async (userUids: string[]) => {
        try {
            const members: { uid: string; name: string }[] = [];
            for (const uid of userUids) {
                const userDocRef = doc(db, "Users", uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    members.push({ uid, name: userData.name });
                } else {
                    console.error(`No user document found for UID: ${uid}`);
                }
            }
            setGroupDetails((prevDetails: any) => ({
                ...prevDetails,
                members,
            }));
            console.log(groupDetails);
        } catch (error) {
            console.error("Error fetching members details:", error);
        }
    };

    useEffect(() => {
        fetchGroupDetails();
        console.log(groupDetails);
    }, [id]);

    const calculateDueDate = () => {
        const now = new Date(); // Current date and time
        const [hours, minutes] = formData.recurrence.time_of_day.split(":").map(Number);
    
        if (formData.recurrence.type === "Daily") {
            // Set the due date to the next occurrence of the specified time
            const dueDate = new Date(now);
            dueDate.setHours(hours, minutes, 0, 0);
    
            if (dueDate <= now) {
                // If the time has already passed for today, set it for tomorrow
                dueDate.setDate(dueDate.getDate() + 1);
            }
    
            return Timestamp.fromDate(dueDate);
        } else if (
            formData.recurrence.type === "Weekly" &&
            formData.recurrence.days_of_week.length > 0
        ) {
            const todayIndex = now.getDay(); // 0 (Sunday) to 6 (Saturday)
            const targetDayIndices = formData.recurrence.days_of_week
                .map((day) =>
                    ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(day)
                )
                .filter((index) => index !== -1); // Convert days to indices
    
            targetDayIndices.sort((a, b) => a - b); // Sort the indices
    
            // Find the next target day
            let targetIndex = targetDayIndices.find((index) => index > todayIndex);
    
            if (targetIndex === undefined) {
                // If no upcoming day this week, use the first day of the next week
                targetIndex = targetDayIndices[0];
            }
    
            const diffDays =
                targetIndex > todayIndex
                    ? targetIndex - todayIndex
                    : 7 - todayIndex + targetIndex;
    
            const dueDate = new Date(now);
            dueDate.setDate(now.getDate() + diffDays);
            dueDate.setHours(hours, minutes, 0, 0);
    
            return Timestamp.fromDate(dueDate);
        } else if (
            formData.recurrence.type === "Monthly" &&
            formData.recurrence.monthly_date
        ) {
            const targetDate = new Date(
                now.getFullYear(),
                now.getMonth(),
                Number(formData.recurrence.monthly_date)
            );
    
            targetDate.setHours(hours, minutes, 0, 0);
    
            if (targetDate <= now) {
                // If the target date has already passed this month, set it for the next month
                targetDate.setMonth(targetDate.getMonth() + 1);
            }
    
            return Timestamp.fromDate(targetDate);
        }
    
        return null; // Return null if no valid recurrence type is provided
    };

    const formatTimestamp = (timestamp: any) => {
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleTimeString("en-US", { hour12: false });
    };

    const handleSubmit = async () => {
        console.log("Form data before validation:", formData);

        try {
            // Validate form fields
            if (!formData.taskName.trim()) throw new Error("Task Name is required");
            if (!formData.priority) throw new Error("Priority is required");
            if (!formData.recurrence.type)
                throw new Error("Recurrence Type is required");
            if (
                formData.recurrence.type === "Daily" &&
                !formData.recurrence.time_of_day.trim()
            )
                throw new Error("Time of Day is required for Daily Recurrence");
            if (
                formData.recurrence.type === "Weekly" &&
                (!formData.recurrence.days_of_week.length ||
                    !formData.recurrence.time_of_day.trim())
            )
                throw new Error("Days and Time are required for Weekly Recurrence");
            if (
                formData.recurrence.type === "Monthly" &&
                (!formData.recurrence.monthly_date ||
                    !formData.recurrence.time_of_day.trim())
            )
                throw new Error("Date and Time are required for Monthly Recurrence");
            if (!formData.rotation_members.length)
                throw new Error("At least one Rotation Member is required");

            // Validate and filter rotation_members
            const validRotationMembers = formData.rotation_members.filter(
                (member) => member.uid && member.name
            );
            console.log("Valid Rotation Members:", validRotationMembers);
            if (!validRotationMembers.length) {
                throw new Error("At least one valid Rotation Member is required");
            }

            // Helper function to format a Firestore Timestamp to "HH:mm:ss"
            // const formatTimestamp = (timestamp: any) => {
            //     const date = new Date(timestamp.seconds * 1000);
            //     return date.toLocaleTimeString("en-US", { hour12: false });
            // };

            // Calculate and format due_date
            const dueDate = calculateDueDate();
            if (!dueDate) throw new Error("Unable to calculate due date");

            const formattedDueDate = dueDate;

            // Construct task data
            const taskData = {
                id: doc(collection(db, "Tasks")).id,
                group_id: id,
                title: formData.taskName,
                description: formData.description,
                category: formData.category,
                priority: formData.priority,
                due_date: formattedDueDate, // Store formatted due date
                recurrence: {
                    type: formData.recurrence.type,
                    days_of_week:
                        formData.recurrence.type === "Weekly"
                            ? formData.recurrence.days_of_week
                            : [],
                    monthly_date:
                        formData.recurrence.type === "Monthly"
                            ? formData.recurrence.monthly_date
                            : null,
                    time_of_day: formData.recurrence.time_of_day,
                },
                rotation_members: validRotationMembers, // Use the filtered members
                current_assignee_id: validRotationMembers[0]?.uid || null,
                next_rotation_index: 1,
                status: "Pending",
                completion_history: [],
                created_by: user?.uid,
                created_at: (Timestamp.now()), // Format created_at timestamp
                updated_at: (Timestamp.now()), // Format updated_at timestamp
            };

            console.log("Validated Task Data:", taskData);

            // Save task to Firestore
            await setDoc(doc(db, "Tasks", taskData.id), taskData);
            alert("Task created successfully!");
            router.replace(`/home/groups/GroupPage?id=${id}`);
        } catch (error) {
            console.error("Error creating task:", error);
            if (error instanceof Error) {
                alert(error.message);
            } else {
                alert("An unknown error occurred");
            }
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <Text h4>Loading...</Text>
            </View>
        );
    }

    if (!groupDetails) {
        return (
            <View style={styles.center}>
                <Text h4>Group not found</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.headerContainer}>
                    <Text h3 style={styles.header}>
                        Create Task
                    </Text>
                    <Button
                        title="Cancel"
                        type="clear"
                        onPress={() => router.back()}
                        buttonStyle={styles.cancelButton}
                    />
                </View>

                <Input
                    label="Task Name"
                    placeholder="Task Name"
                    value={formData.taskName}
                    onChangeText={(text) => setFormData({ ...formData, taskName: text })}
                />
                <Input
                    label="Description"
                    placeholder="Description"
                    value={formData.description}
                    onChangeText={(text) =>
                        setFormData({ ...formData, description: text })
                    }
                />
                <Input
                    label="Category"
                    placeholder="Category"
                    value={formData.category}
                    onChangeText={(text) => setFormData({ ...formData, category: text })}
                />

                <Text style={styles.label}>Priority</Text>
                <View style={styles.priorityContainer}>
                    <Button
                        title="Low"
                        buttonStyle={styles.lowPriorityButton}
                        type={formData.priority === "Low" ? "solid" : "outline"}
                        onPress={() => setFormData({ ...formData, priority: "Low" })}
                    />
                    <Button
                        title="Medium"
                        buttonStyle={styles.mediumPriorityButton}
                        type={formData.priority === "Medium" ? "solid" : "outline"}
                        onPress={() => setFormData({ ...formData, priority: "Medium" })}
                    />
                    <Button
                        title="High"
                        buttonStyle={styles.highPriorityButton}
                        type={formData.priority === "High" ? "solid" : "outline"}
                        onPress={() => setFormData({ ...formData, priority: "High" })}
                    />
                </View>

                <Text style={styles.label}>Recurrence</Text>
                <View style={styles.recurrenceContainer}>
                    <Button
                        title="Daily"
                        type={formData.recurrenceType === "Daily" ? "solid" : "outline"}
                        onPress={() =>
                            setFormData({
                                ...formData,
                                recurrenceType: "Daily",
                                recurrence: { ...formData.recurrence, type: "Daily" },
                            })
                        }
                    />
                    <Button
                        title="Weekly"
                        type={formData.recurrenceType === "Weekly" ? "solid" : "outline"}
                        onPress={() =>
                            setFormData({
                                ...formData,
                                recurrenceType: "Weekly",
                                recurrence: { ...formData.recurrence, type: "Weekly" },
                            })
                        }
                    />
                    <Button
                        title="Monthly"
                        type={formData.recurrenceType === "Monthly" ? "solid" : "outline"}
                        onPress={() =>
                            setFormData({
                                ...formData,
                                recurrenceType: "Monthly",
                                recurrence: { ...formData.recurrence, type: "Monthly" },
                            })
                        }
                    />
                </View>

                {formData.recurrenceType === "Daily" && (
                    <Input
                        label="Time of Day (HH:mm)"
                        placeholder="Time of Day"
                        value={formData.recurrence.time_of_day}
                        onChangeText={(text) =>
                            setFormData({
                                ...formData,
                                recurrence: { ...formData.recurrence, time_of_day: text },
                            })
                        }
                    />
                )}

                {formData.recurrenceType === "Weekly" && (
                    <>
                        <Input
                            label="Days of Week"
                            placeholder="e.g., Monday, Thursday"
                            value={formData.recurrence.days_of_week.join(", ")}
                            onChangeText={(text) =>
                                setFormData({
                                    ...formData,
                                    recurrence: {
                                        ...formData.recurrence,
                                        days_of_week: text.split(",").map((d) => d.trim()),
                                    },
                                })
                            }
                        />
                        <Input
                            label="Time of Day (HH:mm)"
                            placeholder="Time of Day"
                            value={formData.recurrence.time_of_day}
                            onChangeText={(text) =>
                                setFormData({
                                    ...formData,
                                    recurrence: { ...formData.recurrence, time_of_day: text },
                                })
                            }
                        />
                    </>
                )}

                {formData.recurrenceType === "Monthly" && (
                    <>
                        <Input
                            label="Monthly Date"
                            placeholder="1-31"
                            value={formData.recurrence.monthly_date}
                            onChangeText={(text) =>
                                setFormData({
                                    ...formData,
                                    recurrence: { ...formData.recurrence, monthly_date: text },
                                })
                            }
                        />
                        <Input
                            label="Time of Day (HH:mm)"
                            placeholder="Time of Day"
                            value={formData.recurrence.time_of_day}
                            onChangeText={(text) =>
                                setFormData({
                                    ...formData,
                                    recurrence: { ...formData.recurrence, time_of_day: text },
                                })
                            }
                        />
                    </>
                )}

                <Divider style={styles.divider} />

                <Text style={styles.label}>Select Members</Text>
                {groupDetails.members.map((item: { uid: string; name: string }) => (
                    <CheckBox
                        key={item.uid} // Ensure a unique key for each member
                        title={item.name} // Display the member's name
                        checked={formData.rotation_members.some(
                            (m) => m.uid === item.uid
                        )}
                        onPress={() => {
                            const updatedMembers = formData.rotation_members.some(
                                (m) => m.uid === item.uid
                            )
                                ? formData.rotation_members.filter(
                                        (m) => m.uid !== item.uid
                                    )
                                : [
                                        ...formData.rotation_members,
                                        { uid: item.uid, name: item.name },
                                    ];

                            setFormData({ ...formData, rotation_members: updatedMembers });
                        }}
                    />
                ))}

                <Button
                    title="Submit"
                    onPress={handleSubmit}
                    containerStyle={styles.submitButton}
                />
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 8, // Further reduced padding
        transform: [{ scale: 0.95 }], // Scaled down for a more compact look
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    headerContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10, // Reduced margin
    },
    header: {
        fontSize: 18, // Smaller header font size
    },
    cancelButton: {
        marginRight: 10, // Adjust margin as needed
    },
    label: {
        fontSize: 12, // Further reduced label font size
        fontWeight: "500",
        marginBottom: 5, // Reduced margin
    },
    recurrenceContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginBottom: 8, // Reduced spacing
    },
    divider: {
        marginVertical: 10, // Reduced spacing between sections
    },
    submitButton: {
        marginTop: 12, // Reduced margin
        backgroundColor: "#1E90FF",
        borderRadius: 8, // Smaller rounded corners
        height: 35, // Smaller button height
    },
    priorityContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginBottom: 10, // Reduced spacing
    },
    lowPriorityButton: {
        borderColor: "#228B22",
        borderWidth: 2,
        borderRadius: 12, // Smaller rounding
        paddingHorizontal: 8, // Further reduced padding
        paddingVertical: 6, // Further reduced padding
    },
    mediumPriorityButton: {
        borderColor: "#DAA520",
        borderWidth: 2,
        borderRadius: 12, // Smaller rounding
        paddingHorizontal: 8, // Further reduced padding
        paddingVertical: 6, // Further reduced padding
    },
    highPriorityButton: {
        borderColor: "#B22222",
        borderWidth: 2,
        borderRadius: 12, // Smaller rounding
        paddingHorizontal: 8, // Further reduced padding
        paddingVertical: 6, // Further reduced padding
    },
    input: {
        fontSize: 12, // Smaller input text size
        height: 35, // Further reduced input height
        marginBottom: 8, // Reduced spacing between inputs
    },
});
export default CreateTask;
