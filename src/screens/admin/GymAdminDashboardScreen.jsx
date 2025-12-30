import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Ionicons } from '@expo/vector-icons';
import {
  getRooms,
  createRoom,
  getRegisteredUsers,
  getGymMembers,
  sendJoinRequest,
  getRoomMembers,
  removeMember,
} from '../../api/services/communityChatService';
import { getReadableError } from '../../utils/apiError';

const GymAdminDashboardScreen = () => {
  const [activeTab, setActiveTab] = useState('rooms'); // 'rooms', 'users', 'members'
  const [rooms, setRooms] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [gymMembers, setGymMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomMembers, setRoomMembers] = useState([]);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showSendRequestModal, setShowSendRequestModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');

  // Load data based on active tab
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (activeTab === 'rooms') {
        const roomsData = await getRooms();
        setRooms(Array.isArray(roomsData) ? roomsData : []);
      } else if (activeTab === 'users') {
        const usersData = await getRegisteredUsers();
        setRegisteredUsers(Array.isArray(usersData) ? usersData : []);
      } else if (activeTab === 'members') {
        const membersData = await getGymMembers();
        setGymMembers(Array.isArray(membersData) ? membersData : []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', getReadableError(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Load room members
  const loadRoomMembers = async (roomId) => {
    try {
      setLoading(true);
      const members = await getRoomMembers(roomId);
      setRoomMembers(Array.isArray(members) ? members : []);
      setSelectedRoom(roomId);
    } catch (error) {
      console.error('Error loading room members:', error);
      Alert.alert('Error', getReadableError(error));
    } finally {
      setLoading(false);
    }
  };

  // Create new room
  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      Alert.alert('Error', 'Room name is required');
      return;
    }

    try {
      setLoading(true);
      await createRoom({
        name: newRoomName,
        description: newRoomDescription,
      });
      Alert.alert('Success', 'Room created successfully');
      setShowCreateRoomModal(false);
      setNewRoomName('');
      setNewRoomDescription('');
      loadData();
    } catch (error) {
      console.error('Error creating room:', error);
      Alert.alert('Error', getReadableError(error));
    } finally {
      setLoading(false);
    }
  };

  // Send join request
  const handleSendJoinRequest = async () => {
    if (!selectedRoom || !selectedUser) {
      Alert.alert('Error', 'Please select a room and user');
      return;
    }

    try {
      setLoading(true);
      await sendJoinRequest(selectedRoom, selectedUser.id || selectedUser.userId, requestMessage);
      Alert.alert('Success', 'Join request sent successfully');
      setShowSendRequestModal(false);
      setSelectedUser(null);
      setRequestMessage('');
      setSelectedRoom(null);
    } catch (error) {
      console.error('Error sending join request:', error);
      Alert.alert('Error', getReadableError(error));
    } finally {
      setLoading(false);
    }
  };

  // Remove member from room
  const handleRemoveMember = async (roomId, userId) => {
    Alert.alert(
      'Remove Member',
      'Are you sure you want to remove this member from the room?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await removeMember(roomId, userId);
              Alert.alert('Success', 'Member removed successfully');
              if (selectedRoom === roomId) {
                loadRoomMembers(roomId);
              }
              loadData();
            } catch (error) {
              console.error('Error removing member:', error);
              Alert.alert('Error', getReadableError(error));
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderRoomItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => loadRoomMembers(item.id || item._id)}
    >
      <View style={styles.cardHeader}>
        <Ionicons name="chatbubbles" size={24} color="#3b82f6" />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.name || 'Unnamed Room'}</Text>
          {item.description && (
            <Text style={styles.cardSubtitle} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardMeta}>
          {item.memberCount || 0} members
        </Text>
        <TouchableOpacity
          onPress={() => {
            setSelectedRoom(item.id || item._id);
            setShowSendRequestModal(true);
          }}
          style={styles.sendRequestButton}
        >
          <Ionicons name="person-add" size={18} color="#3b82f6" />
          <Text style={styles.sendRequestText}>Send Request</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderUserItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="person-circle" size={24} color="#10b981" />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>
            {item.username || item.name || 'Unknown User'}
          </Text>
          {item.email && (
            <Text style={styles.cardSubtitle}>{item.email}</Text>
          )}
          {item.phone && (
            <Text style={styles.cardSubtitle}>{item.phone}</Text>
          )}
        </View>
      </View>
      {selectedRoom && (
        <TouchableOpacity
          style={styles.sendRequestButton}
          onPress={() => {
            setSelectedUser(item);
            setShowSendRequestModal(true);
          }}
        >
          <Ionicons name="send" size={18} color="#3b82f6" />
          <Text style={styles.sendRequestText}>Send Join Request</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderMemberItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="people" size={24} color="#8b5cf6" />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>
            {item.username || item.name || 'Unknown Member'}
          </Text>
          {item.email && (
            <Text style={styles.cardSubtitle}>{item.email}</Text>
          )}
        </View>
      </View>
      {selectedRoom && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveMember(selectedRoom, item.id || item.userId || item._id)}
        >
          <Ionicons name="trash" size={18} color="#ef4444" />
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Community Chat</Text>
        <Text style={styles.subtitle}>Manage rooms and send join requests</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'rooms' && styles.activeTab]}
          onPress={() => setActiveTab('rooms')}
        >
          <Ionicons
            name="chatbubbles"
            size={20}
            color={activeTab === 'rooms' ? '#3b82f6' : '#6b7280'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'rooms' && styles.activeTabText,
            ]}
          >
            Rooms
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.activeTab]}
          onPress={() => setActiveTab('users')}
        >
          <Ionicons
            name="people"
            size={20}
            color={activeTab === 'users' ? '#3b82f6' : '#6b7280'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'users' && styles.activeTabText,
            ]}
          >
            Users
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'members' && styles.activeTab]}
          onPress={() => setActiveTab('members')}
        >
          <Ionicons
            name="person"
            size={20}
            color={activeTab === 'members' ? '#3b82f6' : '#6b7280'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'members' && styles.activeTabText,
            ]}
          >
            Gym Members
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {activeTab === 'rooms' && (
            <>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setShowCreateRoomModal(true)}
              >
                <Ionicons name="add-circle" size={24} color="#fff" />
                <Text style={styles.createButtonText}>Create Room</Text>
              </TouchableOpacity>

              {selectedRoom && (
                <View style={styles.membersSection}>
                  <Text style={styles.sectionTitle}>Room Members</Text>
                  {roomMembers.length > 0 ? (
                    <FlatList
                      data={roomMembers}
                      renderItem={renderMemberItem}
                      keyExtractor={(item) =>
                        item.id || item.userId || item._id || Math.random().toString()
                      }
                      scrollEnabled={false}
                    />
                  ) : (
                    <Text style={styles.emptyText}>No members in this room</Text>
                  )}
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                      setSelectedRoom(null);
                      setRoomMembers([]);
                    }}
                  >
                    <Text style={styles.backButtonText}>Back to Rooms</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!selectedRoom && (
                <FlatList
                  data={rooms}
                  renderItem={renderRoomItem}
                  keyExtractor={(item) => item.id || item._id || Math.random().toString()}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No rooms found. Create one to get started!</Text>
                  }
                  scrollEnabled={false}
                />
              )}
            </>
          )}

          {activeTab === 'users' && (
            <FlatList
              data={registeredUsers}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.id || item.userId || item._id || Math.random().toString()}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No registered users found</Text>
              }
              scrollEnabled={false}
            />
          )}

          {activeTab === 'members' && (
            <FlatList
              data={gymMembers}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.id || item.userId || item._id || Math.random().toString()}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No gym members found</Text>
              }
              scrollEnabled={false}
            />
          )}
        </ScrollView>
      )}

      {/* Create Room Modal */}
      <Modal
        visible={showCreateRoomModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateRoomModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Room</Text>
            <TextInput
              style={styles.input}
              placeholder="Room Name *"
              value={newRoomName}
              onChangeText={setNewRoomName}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={newRoomDescription}
              onChangeText={setNewRoomDescription}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateRoomModal(false);
                  setNewRoomName('');
                  setNewRoomDescription('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateRoom}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.createButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Send Request Modal */}
      <Modal
        visible={showSendRequestModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSendRequestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Send Join Request</Text>
            {selectedUser && (
              <Text style={styles.modalSubtitle}>
                To: {selectedUser.username || selectedUser.name || 'User'}
              </Text>
            )}
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Message (optional)"
              value={requestMessage}
              onChangeText={setRequestMessage}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowSendRequestModal(false);
                  setRequestMessage('');
                  setSelectedUser(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleSendJoinRequest}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.createButtonText}>Send Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    gap: 8,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#6b7280',
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  activeTab: {
    backgroundColor: '#dbeafe',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  cardMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  sendRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#dbeafe',
    borderRadius: 6,
  },
  sendRequestText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fee2e2',
    borderRadius: 6,
    marginTop: 8,
  },
  removeButtonText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  backButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  membersSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    padding: 40,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GymAdminDashboardScreen;


