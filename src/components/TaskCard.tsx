import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Task {
  title: string;
  priority: string;
  due_date: { seconds: number };
  current_assignee_id: string;
}

interface Member {
  uid: string;
  avatar: string;
}

interface TaskCardProps {
  task: Task;
  members: Member[];
}

const TaskCard: React.FC<TaskCardProps> = ({ task, members }) => {
  const currentAssignee = members.find((member) => member.uid === task.current_assignee_id);

  return (
    <LinearGradient
      colors={['#6a11cb', '#2575fc']}
      style={styles.cardContainer}
    >
      {/* User Avatar Section */}
      <View style={styles.avatarContainer}>
        <Image
          source={{
            uri: currentAssignee?.avatar || 'https://via.placeholder.com/50', // Placeholder or avatar URL
          }}
          style={styles.avatar}
        />
      </View>

      {/* Task Details Section */}
      <View style={styles.taskDetails}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <Text style={styles.taskPriority}>Priority: {task.priority}</Text>
        <Text style={styles.taskDueDate}>Due: {new Date(task.due_date.seconds * 1000).toLocaleString()}</Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fff',
  },
  taskDetails: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  taskPriority: {
    fontSize: 14,
    color: '#f0f0f0',
    marginTop: 5,
  },
  taskDueDate: {
    fontSize: 14,
    color: '#e0e0e0',
    marginTop: 5,
  },
});

export default TaskCard;