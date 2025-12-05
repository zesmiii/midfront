import { gql } from '@apollo/client';

export const ME_QUERY = gql`
  query Me {
    me {
      id
      username
      email
      createdAt
      updatedAt
    }
  }
`;

export const SEARCH_USERS_QUERY = gql`
  query SearchUsers($search: String) {
    users(search: $search) {
      id
      username
      email
      createdAt
      updatedAt
    }
  }
`;

export const GET_USER_QUERY = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      username
      email
      createdAt
      updatedAt
    }
  }
`;

export const GET_CHATS_QUERY = gql`
  query GetChats {
    chats {
      id
      name
      type
      participants {
        id
        username
        email
      }
      createdBy {
        id
        username
      }
      lastMessage {
        id
        content
        imageUrl
        sender {
          id
          username
        }
        createdAt
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_CHAT_QUERY = gql`
  query GetChat($id: ID!) {
    chat(id: $id) {
      id
      name
      type
      participants {
        id
        username
        email
      }
      createdBy {
        id
        username
      }
      lastMessage {
        id
        content
        imageUrl
        sender {
          id
          username
        }
        createdAt
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_MESSAGES_QUERY = gql`
  query GetMessages($chatId: ID!, $limit: Int, $offset: Int) {
    messages(chatId: $chatId, limit: $limit, offset: $offset) {
      id
      content
      imageUrl
      sender {
        id
        username
      }
      chat {
        id
        name
        type
        participants {
          id
          username
        }
      }
      createdAt
      updatedAt
    }
  }
`;


