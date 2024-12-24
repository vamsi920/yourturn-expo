import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '../../../firebase';
import { Ionicons } from '@expo/vector-icons';

const GroupPage = ({ currentUserId }: { currentUserId: string }) => {
  const params = useLocalSearchParams();
  const id = params.id as string;
  const [groupDetails, setGroupDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [membersDetails, setMembersDetails] = useState<any[]>([]);
  const [showMembers, setShowMembers] = useState(false);

  const fetchGroupDetails = async () => {
    try {
      if (!id) {
        throw new Error('Group ID is required');
      }

      const groupDocRef = doc(db, 'Groups', id);
      const groupDoc = await getDoc(groupDocRef);

      if (groupDoc.exists()) {
        const groupData = groupDoc.data();
        setGroupDetails({ ...groupData, description: groupData.description || '' });

        // Fetch members' details
        if (groupData.members && groupData.members.length > 0) {
          const userUids = groupData.members.map((member: any) => member.uid);
          fetchMembersDetails(userUids);
        }
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchMembersDetails = async (userUids: string[]) => {
    try {
      const members = [];
      for (const uid of userUids) {
        const userDocRef = doc(db, 'Users', uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          members.push({ ...userDoc.data(), uid });
        } else {
          console.error(`No user document found for UID: ${uid}`);
        }
      }
      setMembersDetails(members);
    } catch (error) {
      console.error('Error fetching members details:', error);
    }
  };

  const handleKickOut = async (memberId: string) => {
    try {
      const groupDocRef = doc(db, 'Groups', id);
      await updateDoc(groupDocRef, {
        members: arrayRemove({ uid: memberId }),
      });
      setMembersDetails((prev) => prev.filter((member) => member.uid !== memberId));
      Alert.alert('Success', 'Member has been removed.');
    } catch (error) {
      console.error('Error removing member:', error);
      Alert.alert('Error', 'Failed to remove member.');
    }
  };

  const handleLeaveGroup = async () => {
    try {
      const groupDocRef = doc(db, 'Groups', id);
      await updateDoc(groupDocRef, {
        members: arrayRemove({ uid: currentUserId }),
      });
      Alert.alert('Success', 'You have left the group.');
      // Optionally navigate back to the home screen
    } catch (error) {
      console.error('Error leaving group:', error);
      Alert.alert('Error', 'Failed to leave the group.');
    }
  };

  useEffect(() => {
    fetchGroupDetails();
  }, [id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGroupDetails();
  }, []);

  if (loading) {
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
    (member: any) => member.uid === currentUserId && member.role === 'admin'
  );

  return (
    <View style={styles.container}>
      {/* Top Header Section */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.iconContainer, { backgroundColor: '#' + ((Math.random() * 0xFFFFFF) << 0).toString(16) }]}>
            <Text style={styles.emoji}>{groupDetails.icon}</Text>
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.title}>{groupDetails.name}</Text>
            <Text style={styles.subtitle}>
              {membersDetails.length} people are in the group
            </Text>
          </View>
        </View>
      </View>

      {/* Members Section */}
      <View style={styles.membersSection}>
        <Text style={styles.sectionTitle}>In The Room</Text>
        <TouchableOpacity onPress={() => setShowMembers(!showMembers)}>
          <Text style={styles.toggleButton}>
            {showMembers ? 'Hide Members' : 'Show Members'}
          </Text>
        </TouchableOpacity>
        {showMembers && (
          <FlatList
            data={membersDetails}
            keyExtractor={(item) => item.uid.toString()}
            renderItem={({ item }) => (
              <View style={styles.memberCard}>
                <Ionicons name="person-circle-outline" size={40} color="#007bff" />
                <View style={styles.memberDetails}>
                  <Text style={styles.memberName}>{item.name || 'Unknown'}</Text>
                  <Text style={styles.memberRole}>
                    {groupDetails.members.find((member: any) => member.uid === item.uid)?.role ||
                      'Member'}
                  </Text>
                </View>
                {item.uid === currentUserId ? (
                  <TouchableOpacity
                    style={styles.leaveButton}
                    onPress={handleLeaveGroup}
                  >
                    <Text style={styles.leaveText}>Leave</Text>
                  </TouchableOpacity>
                ) : (
                  isAdmin && (
                    <TouchableOpacity
                      style={styles.kickOutButton}
                      onPress={() => handleKickOut(item.uid)}
                    >
                      <Text style={styles.kickOutText}>Kick Out</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            )}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 10,
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
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  membersSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
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
    fontWeight: 'bold',
    color: '#333',
  },
  memberRole: {
    fontSize: 12,
    color: '#999',
  },
  emoji: { fontSize: 30 },
  toggleButton: {
    fontSize: 16,
    color: '#007bff',
    textDecorationLine: 'underline',
    marginTop: 10,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaveButton: {
    padding: 5,
    backgroundColor: '#f0ad4e',
    borderRadius: 5,
  },
  leaveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  kickOutButton: {
    padding: 5,
    backgroundColor: '#d9534f',
    borderRadius: 5,
  },
  kickOutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});

export default GroupPage;