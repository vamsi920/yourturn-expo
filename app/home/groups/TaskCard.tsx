import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TaskCard = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Task Title</Text>
            <Text style={styles.description}>Task Description</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
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
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    description: {
        fontSize: 14,
        color: '#666',
    },
});

export default TaskCard;