# AEXP Challenge

The system is experiencing few issues in production:
- Slow response times, especially when there are more number of events
- Poor resilience when external services are unavailable

## Table of Contents

1. [Get Started](#1-get-started)
   - [1.1 Prerequisites](#11-prerequisites)
     - [1.1.1 Usage](#111-usage)
   - [1.2 Start the Server](#12-start-the-server)

2. [Task II](#2-task-ii)
   - [2.1 Observations](#21-observations)
   - [2.2 Response Times](#22-response-times)
   - [2.3 Issue](#23-issue)
   - [2.4 Solution](#24-solution)
   - [2.5 Testing](#25-testing)

3. [Task III](#3-task-iii)
   - [3.1 Observations](#31-observation)
   - [3.2 Issue](#32-issue)
   - [3.3 Solution](#33-solution)
   - [3.4 Testing](#34-testing)

4. [Debugging the Code](#4-debugging-the-code)

---

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

## 3. Task III

### 3.1 Observations: 
When making API calls to `/addEvent`, which depends on an external API service, the following pattern is observed:

- First 5 calls: Success
- Next 10 calls (calls 6-15): All calls fail with external service error responses.
- Call 16 onwards: Success response is received


### 3.2 Issue:

Continuously calling the API adds unncessary load on the server even though it is returning an error. 
It lacks a good backoff mechanism which handles the load gracefully. 

### 3.3 Solution:
It is ideal to implement a backoff mechanism where, if the API fails for a certain number of times, we should not be making the API call to the server.

Instead return a fail response to the user after 3 error responses and advise to wait for 30 seconds and try again. 

Once the API returns an error response, an errorCounter keeps track of the number of requests. Limited to 3. 

Once the limit is exceeded, `/addEvent` calls wont hit the external API for 30 seconds which is tracked by a cooldown time tracker (30s).

After waiting for 30 seconds, we retry by making a singular call to the external API to check if the service is back up. 

If the external API is not up and running, we intimate the user to wait additional 30 seconds before making the call. 

Any calls, that are made within the 30 seconds, will be failed without hitting the external API.

### 3.4 Testing:
- To test this solution, navigate to `rest-tests.http` file and make 5 successful `/addEvent` POST calls. 
- Make 6th, 7th, 8th calls which returns an error response by calling the external API. 
- Make subsequent calls to the external API within 30 seconds, it should not hit the external API and return the below error
```
Event service is temporaily unavailable. Please try again later after 30 seconds.
```
- Wait for 30 seconds and send the request again, it will attempt one call to the external API which will return an error.  
- The cool down timer should reset again, asking the user to wait for 30 more seconds. 
- Once the 15 calls reach the external API, user should get 5 more success responses and the cycle repeats.



### 4. Debugging the code

In VS Code, click on `'Run and Debug'` in the Activity Bar. 

A configuration `(Debug: AEXP Challenge)` is setup in the `'.vscode/launch.json'` which starts the server in a debug mode when you click on the green play icon . 

Add breakpoints to your code where necessary.

Once the server starts, Send Requests and wait for code to reach the breakpoint. You can then step into, step over, the code and debug it. 

# Thank you!
