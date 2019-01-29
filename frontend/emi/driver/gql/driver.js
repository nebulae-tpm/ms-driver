import gql from "graphql-tag";

// We use the gql tag to parse our query string into a query document

//Hello world sample, please remove
export const getHelloWorld = gql`
  query getHelloWorldFromDriver{
    getHelloWorldFromDriver{
      sn
    }
  }
`;

export const DriverDriverBlocks = gql`
  query DriverDriverBlocks($id: String!) {
    DriverDriverBlocks(id: $id) {
      key
      notes
      vehicleId
      startTime
      endTime
      user
    }
  }
`;



//Hello world sample, please remove
export const DriverHelloWorldSubscription = gql`
  subscription{
    DriverHelloWorldSubscription{
      sn
  }
}`;

export const DriverDriver = gql`
  query DriverDriver($id: String!) {
    DriverDriver(id: $id) {
      _id
      generalInfo {
        documentType
        document
        name
        lastname
        email
        phone
        gender
        pmr
        languages {
          name
          active
        }
      }
      auth {
        userKeycloakId
        username
      }
      state
      membership {
        active
      }
      creationTimestamp
      creatorUser
      modificationTimestamp
      modifierUser
    }
  }
`;

export const DriverDrivers = gql`
  query DriverDrivers($filterInput: FilterInput!, $paginationInput: PaginationInput!) {
    DriverDrivers(filterInput: $filterInput, paginationInput: $paginationInput) {
      _id
      generalInfo {
        documentType
        document
        name
        lastname
        email
        phone
        gender
        pmr
        languages {
          name
          active
        }
      }
      auth {
        userKeycloakId
        username
      }
      state
      membership {
        active
      }
      creationTimestamp
      creatorUser
      modificationTimestamp
      modifierUser
    }
  }
`;

export const DriverDriversSize = gql`
  query DriverDriversSize($filterInput: FilterInput!) {
    DriverDriversSize(filterInput: $filterInput)
  }
`;

export const DriverCreateDriver = gql `
  mutation DriverCreateDriver($input: DriverDriverInput!){
    DriverCreateDriver(input: $input){
      code
      message
    }
  }
`;

export const DriverUpdateDriverGeneralInfo = gql `
  mutation DriverUpdateDriverGeneralInfo($id: ID!, $input: DriverDriverGeneralInfoInput!){
    DriverUpdateDriverGeneralInfo(id: $id, input: $input){
      code
      message
    }
  }
`;

export const RemoveDriverBlocking = gql `
  mutation DriverRemoveDriverBlocking($id: ID!, $blockKey: String!){
    DriverRemoveDriverBlocking(id: $id, blockKey: $blockKey){
      code
      message
    }
  }
`;

export const DriverUpdateDriverState = gql `
  mutation DriverUpdateDriverState($id: ID!, $newState: Boolean!){
    DriverUpdateDriverState(id: $id, newState: $newState){
      code
      message
    }
  }
`;


export const DriverUpdateDriverMembershipState = gql `
  mutation DriverUpdateDriverMembershipState($id: ID!, $newState: Boolean!){
    DriverUpdateDriverMembershipState(id: $id, newState: $newState){
      code
      message
    }
  }
`;

export const DriverCreateDriverAuth = gql`
  mutation DriverCreateDriverAuth($id: ID!, $username: String!, $input: DriverAuthInput) {
    DriverCreateDriverAuth(id: $id, username: $username, input: $input) {
      code
      message
    }
  }
`;

export const DriverRemoveDriverAuth = gql`
  mutation DriverRemoveDriverAuth($id: ID!) {
    DriverRemoveDriverAuth(id: $id) {
      code
      message
    }
  }
`;

export const DriverResetDriverPassword = gql`
  mutation DriverResetDriverPassword($id: ID!, $input: DriverPasswordInput) {
    DriverResetDriverPassword(id: $id, input: $input) {
      code
      message
    }
  }
`;

// SUBSCRIPTION
export const DriverDriverUpdatedSubscription = gql`
  subscription{
    DriverDriverUpdatedSubscription{
      _id
      generalInfo {
        documentType
        document
        name
        lastname
        email
        phone
        gender
        pmr
        languages {
          name
          active
        }
      }
      state
      creationTimestamp
      creatorUser
      modificationTimestamp
      modifierUser
    }
  }
`;
