import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../../../src/hoooks/useAuth';
import { db } from '../../../../firebase'; // Import your Firestore instance

const UserScreen = () => {
  const { user, loading } = useAuth(); // Ensure `loading` is used

  const [userDetails, setUserDetails] = useState<any>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [tasksDone, setTasksDone] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (loading) return; // Wait until user state is loaded
      if (user?.uid) {
        try {
          const userDocRef = doc(db, 'Users', user.uid); // Match UID stored during signup
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            setUserDetails(userDoc.data());
            await fetchUserTasks(user.uid);
          } else {
            console.error('No such user document!');
          }
        } catch (error) {
          console.error('Error fetching user details:', error);
        } finally {
          setFetchLoading(false);
        }
      } else {
        setFetchLoading(false);
      }
    };
    const fetchUserTasks = async (userId: string) => {
      try {
      const tasksSnapshot = await getDocs(collection(db, 'Tasks'));
      let doneCount = 0;
      let pendingCount = 0;
      let totalCount = 0;

      tasksSnapshot.forEach((doc) => {
        const task = doc.data();
        if (task.rotation_members && task.rotation_members.some((member: { uid: string }) => member.uid === userId)) {
          totalCount++;
          if (task.status === 'Completed') {
            doneCount++;
          } else if (task.status === 'Pending') {
            pendingCount++;
          }
        }
      });


      setTasksDone(doneCount);
      setPendingTasks(pendingCount);
      setTotalTasks(totalCount);
      } catch (error) {
      console.error('Error fetching user tasks:', error);
      }
    };

    fetchUserDetails();
  }, [user, loading]);

  if (loading || fetchLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!userDetails) {
    return (
      <View style={styles.container}>
        <Text>No user details available.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Section */}
      <View style={styles.topSection}>
        <Text style={styles.username}>{userDetails.name || 'N/A'}</Text>
        <Text style={styles.userEmail}>{userDetails.email || 'N/A'}</Text>
        <Text style={styles.userPhone}>{userDetails.phone_number || 'N/A'}</Text>
        <View style={styles.stats}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{tasksDone}</Text>
            <Text style={styles.statLabel}>Tasks Done</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{pendingTasks}</Text>
            <Text style={styles.statLabel}>Pending Tasks</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalTasks}</Text>
            <Text style={styles.statLabel}>Total Tasks</Text>
          </View>
        </View>
      </View>

      {/* Scrollable Activity Section */}
      <ScrollView style={styles.activitySection}>
        <Text style={styles.activityTitle}>Activity</Text>
        {Array.from({ length: Math.floor(Math.random() * 6) + 15 }).map((_, index) => (
          <View key={index} style={styles.activityBox}>
            <Text>Sample Activity {index + 1}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  topSection: {
    backgroundColor: '#87CEEB', // Sky blue theme
    padding: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: 'center',
  },
  username: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  userEmail: {
    fontSize: 16,
    color: '#fff',
    marginTop: 5,
  },
  userPhone: {
    fontSize: 16,
    color: '#fff',
    marginTop: 5,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 14,
    color: '#fff',
    marginTop: 5,
  },
  activitySection: {
    flex: 1,
    padding: 20,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  activityBox: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
});

export default UserScreen;