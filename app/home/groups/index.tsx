import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Animated,
    TextInput,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../../firebase'; // Adjust the import path based on your structure
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    serverTimestamp,
    updateDoc,
    arrayUnion,
    query,
    where,
} from 'firebase/firestore';
import { useAuth } from '../../../src/hoooks/useAuth'; // Ensure you are using the proper auth hook
import { useRouter } from 'expo-router';

const emojiIcons = [
    '🍕', '🎸', '🌟', '⚡', '🎮', '🌺', '🦄', '🍩', '🚀', '🐱', '🐶', '🍔', '🍎', '🏀', '⚽', '📚', '🎧', '🎲', '✈️', '🎂',
];
const ionIcons = [
    'home-outline', 'chatbubble-outline', 'people-outline', 'star-outline', 'planet-outline', 'moon-outline', 'game-controller-outline', 'rocket-outline', 'umbrella-outline', 'gift-outline',
];

const GroupsScreen = () => {
    const { user, loading } = useAuth(); // Access authenticated user from context
    const [modalVisible, setModalVisible] = useState(false);
    const [joinModalVisible, setJoinModalVisible] = useState(false);
    const [homeName, setHomeName] = useState('');
    const [description, setDescription] = useState('');
    const [inviteId, setInviteId] = useState('');
    const slideAnim = new Animated.Value(300); // Animation value for the modal
    const [groups, setGroups] = useState<{ id: string; name: string; members: any[]; icon?: string }[]>([]);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null); // State for current user details
    const router = useRouter();

    const fetchGroups = async () => {
        if (loading) return; // Wait until user state is loaded
        if (user?.uid) {
            try {
                const userDocRef = doc(db, 'Users', user.uid);
                const userDoc = await getDoc(userDocRef);
                const userData = userDoc.data();
                // console.log(userData)
                setCurrentUser(userData); // Store user details in state

                if (userData?.linked_groups?.length > 0) {
                    const groupIds = userData?.linked_groups || [];
                    const groupsRef = collection(db, 'Groups');
                    const q = query(groupsRef, where('__name__', 'in', groupIds));
                    const snapshot = await getDocs(q);
                    const fetchedGroups = snapshot.docs.map((doc) => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            name: data.name,
                            members: data.members,
                            icon: data.icon,
                        };
                    });
                    setGroups(fetchedGroups);
                } else {
                    setGroups([]);
                }
            } catch (error) {
                console.error('Error fetching groups:', error);
            } finally {
                setFetchLoading(false);
                setRefreshing(false);
            }
        } else {
            setFetchLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, [user, loading]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchGroups();
    };

    const renderGroup = ({ item }: { item: any }) => (
        <TouchableOpacity
          style={styles.groupCard}
          onPress={() => {
            // console.log('hi'); // Debug message
            router.push(`/home/groups/GroupPage?id=${item.id}`);
          }}
          activeOpacity={0.7} // Add visual feedback on press
        >
          <View style={[styles.groupIcon, { backgroundColor: generateRandomColor() }]}>
            {emojiIcons.includes(item.icon) ? (
              <Text style={styles.emoji}>{item.icon}</Text>
            ) : (
              <Ionicons name={item.icon} size={30} color="white" />
            )}
          </View>
          <Text style={styles.groupName}>{item.name}</Text>
          <Text style={styles.groupMembers}>{item.members.length} Members</Text>
        </TouchableOpacity>
      );

    const openModal = () => {
        setModalVisible(true);
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
    };

    const closeModal = () => {
        Animated.timing(slideAnim, {
            toValue: 300,
            duration: 300,
            useNativeDriver: false,
        }).start(() => {
            setModalVisible(false);
            setHomeName('');
            setDescription('');
        });
    };

    const openJoinModal = () => {
        setJoinModalVisible(true);
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
    };

    const closeJoinModal = () => {
        Animated.timing(slideAnim, {
            toValue: 300,
            duration: 300,
            useNativeDriver: false,
        }).start(() => {
            setJoinModalVisible(false);
            setInviteId('');
        });
    };

    const generateInviteCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        return Array.from({ length: 5 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    };

    const generateRandomIcon = () => {
        return Math.random() > 0.5
            ? emojiIcons[Math.floor(Math.random() * emojiIcons.length)]
            : ionIcons[Math.floor(Math.random() * ionIcons.length)];
    };

    const generateRandomColor = () => {
        const colors = ['#FF5733', '#33C1FF', '#8D33FF', '#FF33A6', '#33FF57'];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    const handleCreateGroup = async () => {
        if (!homeName.trim()) {
            alert('Group name cannot be empty!');
            return;
        }

        const inviteCode = generateInviteCode(); // Generate a short invite code
        const groupIcon = generateRandomIcon(); // Assign a random icon or emoji

        const groupDetails = {
            name: homeName,
            description,
            invite_code: inviteCode,
            icon: groupIcon,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
            members: [
                {
                    uid: user?.uid || '', // Current user's UID
                    name: currentUser?.name || 'Unknown', // Current user's name
                    email: user?.email || '', // Current user's email
                    role: 'admin', // Current user is the admin
                },
            ],
        };

        try {
            // Add the group to the Groups collection
            const groupRef = await addDoc(collection(db, 'Groups'), groupDetails);
            // console.log('Group Created with ID:', groupRef.id);

            // Add invite code mapping to a separate collection
            await addDoc(collection(db, 'InviteMappings'), {
                invite_code: inviteCode,
                group_id: groupRef.id,
            });

            // Update the user's linked_groups in the Users collection
            if (user?.uid) {
                const userDocRef = doc(db, 'Users', user.uid);
                await updateDoc(userDocRef, {
                    linked_groups: arrayUnion(groupRef.id), // Add the new group ID to the linked_groups array
                });
            }

            // Update the local state
            setGroups((prevGroups) => [
                ...prevGroups,
                { id: groupRef.id, ...groupDetails },
            ]);
            closeModal();
        } catch (error) {
            console.error('Error creating group or updating user:', error);
            alert('Failed to create group. Please try again.');
        }
    };

    const handleJoinGroup = async () => {
        if (!inviteId.trim()) {
            alert('Invite ID cannot be empty!');
            return;
        }

        try {
            const inviteMappingsRef = collection(db, 'InviteMappings');
            const q = query(inviteMappingsRef, where('invite_code', '==', inviteId));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                alert('Invalid Invite ID');
                return;
            }

            const inviteMapping = querySnapshot.docs[0].data();
            const groupId = inviteMapping.group_id;

            // Add the user to the group's members
            const groupDocRef = doc(db, 'Groups', groupId);
            await updateDoc(groupDocRef, {
                members: arrayUnion({
                    uid: user?.uid || '',
                    name: currentUser?.name || 'Unknown',
                    email: user?.email || '',
                    role: 'member',
                }),
            });

            // Update the user's linked_groups in the Users collection
            if (user?.uid) {
                const userDocRef = doc(db, 'Users', user.uid);
                await updateDoc(userDocRef, {
                    linked_groups: arrayUnion(groupId),
                });
            }

            // Update the local state
            const groupSnapshot = await getDocs(collection(db, 'Groups'));
            const fetchedGroups = groupSnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name,
                    members: data.members,
                    icon: data.icon,
                };
            });
            setGroups(fetchedGroups);

            closeJoinModal();
        } catch (error) {
            console.error('Error joining group:', error);
            alert('Failed to join group. Please try again.');
        }
    };

    if (loading || fetchLoading) {
        return (
            <View style={styles.container}>
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <Text style={styles.header}>My Groups</Text>
            <Text style={styles.subHeader}>You have {groups.length} groups</Text>

            {/* Groups Grid */}
            <FlatList
                data={groups}
                renderItem={renderGroup}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={styles.groupsContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            />

            {/* Floating Action Buttons */}
            <View style={styles.fabContainer}>
                <TouchableOpacity style={styles.fab} onPress={openJoinModal}>
                    <Ionicons name="search" size={28} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.fab} onPress={openModal}>
                    <Ionicons name="add" size={28} color="white" />
                </TouchableOpacity>
            </View>

            {/* Modal for Adding Group */}
            {modalVisible && (
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Create a New Group</Text>
        <TouchableOpacity onPress={closeModal}>
          <Ionicons name="close" size={28} color="#333" />
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Enter Group Name"
        placeholderTextColor="#555"
        value={homeName}
        onChangeText={setHomeName}
      />
      <TextInput
        style={styles.input}
        placeholder="Enter Description (Optional)"
        placeholderTextColor="#555"
        value={description}
        onChangeText={setDescription}
      />
      <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
        <Text style={styles.createButtonText}>Create</Text>
      </TouchableOpacity>
    </View>
  </View>
)}

            {/* Modal for Joining Group */}
            {joinModalVisible && (
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Join a Group</Text>
        <TouchableOpacity onPress={closeJoinModal}>
          <Ionicons name="close" size={28} color="#333" />
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Enter Invite ID"
        placeholderTextColor="#555"
        value={inviteId}
        onChangeText={setInviteId}
      />
      <TouchableOpacity style={styles.createButton} onPress={handleJoinGroup}>
        <Text style={styles.createButtonText}>Join</Text>
      </TouchableOpacity>
    </View>
  </View>
)}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa', paddingHorizontal: 20, paddingTop: 50 },
    header: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 5 },
    subHeader: { fontSize: 16, color: '#666', marginBottom: 20 },
    groupsContainer: { justifyContent: 'space-between' },
    groupCard: { backgroundColor: '#fff', borderRadius: 10, marginBottom: 20, marginHorizontal: 10, padding: 15, alignItems: 'center', width: '45%', elevation: 2 },
    groupIcon: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
    emoji: { fontSize: 30 },
    groupName: { fontSize: 16, fontWeight: 'bold', color: '#333', textAlign: 'center' },
    groupMembers: { fontSize: 12, color: '#666', marginTop: 5 },
    fabContainer: { position: 'absolute', bottom: 20, right: 20, flexDirection: 'row' },
    fab: { backgroundColor: '#007bff', width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginHorizontal: 10 },
    modalContainer: {
        width: '85%', // Reduce size to make it smaller
        maxWidth: 400,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        elevation: 10, // Shadow effect for Android
        shadowColor: '#000', // Shadow effect for iOS
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        zIndex: 2,
      },
      modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
      },
      modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
      },
      modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
      },
      input: {
        height: 50,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 15,
        marginBottom: 20,
      },
      createButton: {
        backgroundColor: '#007bff',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
      },
      createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
      },
});

export default GroupsScreen;
