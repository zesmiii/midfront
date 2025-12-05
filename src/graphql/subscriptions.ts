import { gql } from '@apollo/client';

export const MESSAGE_ADDED_SUBSCRIPTION = gql`
  subscription MessageAdded($chatId: ID!) {
    messageAdded(chatId: $chatId) {
      id
      content
      imageUrl
      sender {
        id
        username
        email
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


