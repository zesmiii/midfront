import { gql } from '@apollo/client';

export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      user {
        id
        username
        email
        createdAt
      }
    }
  }
`;


export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        id
        username
        email
      }
    }
  }
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

export const CREATE_DM_MUTATION = gql`
  mutation CreateDM($participantId: ID!) {
    createDM(participantId: $participantId) {
      id
      type
      participants {
        id
        username
      }
      createdAt
    }
  }
`;

export const CREATE_GROUP_CHAT_MUTATION = gql`
  mutation CreateGroupChat($input: CreateGroupChatInput!) {
    createGroupChat(input: $input) {
      id
      name
      type
      participants {
        id
        username
      }
      createdBy {
        id
        username
      }
      createdAt
    }
  }
`;

export const SEND_MESSAGE_MUTATION = gql`
  mutation SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input) {
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
      }
      createdAt
    }
  }
`;


