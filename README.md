# AEXP Challenge

The system is experiencing few issues in production:
- Slow response times, especially when there are more number of events
- Poor resilience when external services are unavailable

## 1. Get Started

To install the dependencies and get the application up and running, run the following commands in the terminal window. 

```bash
npm i
```

### 1.1 Prerequisites
- Ensure that [REST Client](https://marketplace.visualstudio.com/items/?itemName=humao.rest-client) VS Code extension is installed. 

#### 1.1.1 Usage
1. Navigate to `rest-tests.http` file.
2. You can click on 'Send Request' above any API to make that call. 


### 1.2 Start the Server

To start the server, run the below command in your terminal. 

```bash
npm start
```

Once the server starts, click on 'Send Request' above the API call to test it. 
You will get the response in the adjacent window. 


## 2. Task II 

### 2.1 Observations:

Observed delayed response in `/getEventsByUserId` endpoint after adding events at `/addEvent` endpoint. 

### 2.2 Response Times: 

```
- Initial Get Events By User ID: 543ms
- After adding an event, get events by user ID - 1031ms
- After adding second event, get events by user ID - 1516ms
- After adding 2 more (4) events, get events by user ID - 2528ms
- After adding another event (5) get events by user ID - 3035 ms
- As events are added, the response time for get events by user ID is increasing 
```

### 2.3 Issue: 
The delay in the response time is occuring due to the API call making multiple sequential API calls in a for loop. 

User makes the below API call (`/getEventsByUserID/:id`)

```http
GET http://localhost:3000/getEventsByUserId/3
content-type: application/json
```

This triggers the following flow.

```
--> Call `/getUsersById/:id` to get user data
--> Extract the list of event IDs for that user's event array 
--> Make multiple `/getEventsById/:eventId` calls for each event ID in a loop. 
```

### 2.4 Solution:
- To make the API call faster, looping mechanism has been removed and already configured `/getEvents` call was used to get all the events.
- Then these events are stored in-memory and `.filter()` method was used to find events matching the userID.
- This solution has made the api call significantly faster (Response Time ~ 6-10ms) by decreasing the number of calls. 
- This solution essentially reduces the number of api calls from N+1 to only 2 calls in turn reducing the response time.

### 2.5 Testing:
- To test this API, navigate to `rest-tests.http` file and make multiple `/addEvent` POST calls. 
- Make a GET call on `/getEventByUserId` endpoint. 
- Observe the response time on the status bar. 
- Ideally the response time should be around 6-10ms. 

## Task III

### Issue:

### Solution:

### Testing: