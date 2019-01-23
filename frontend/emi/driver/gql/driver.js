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
        name
        description
      }
      state
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
        name
        description
      }
      state
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

export const DriverUpdateDriverState = gql `
  mutation DriverUpdateDriverState($id: ID!, $newState: Boolean!){
    DriverUpdateDriverState(id: $id, newState: $newState){
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
        name
        description
      }
      state
      creationTimestamp
      creatorUser
      modificationTimestamp
      modifierUser
    }
  }
`;
