const fastify = require('fastify')({ logger: true });
const listenMock = require('../mock-server');
const { logger } = require('../utils/logger')

const LOG_LEVEL = 'debug';

const log = {
  debug: (message, meta) => {if (['debug'].includes(LOG_LEVEL)) logger.debug(message, meta);},
  info: (message, meta) => {if (['debug', 'info'].includes(LOG_LEVEL)) logger.info(message, meta);},
  warn: (message, meta) => {if (['debug', 'info', 'warn'].includes(LOG_LEVEL)) logger.warn(message, meta);},
  error: (message, error) => {if (['debug', 'info', 'warn', 'error'].includes(LOG_LEVEL)) logger.error(message, error);}
};

let successCount = 0;
let errorCount = 0;

let initialErrorTime = null;
let serviceBlockedTime = null;

let isServiceBlocked = false;
let isServiceAvailable = false;

const SERVICE_BLOCKED_THRESHOLD = 3;
const SERVICE_BLOCKED_DURATION = 30_000;
const COOLDOWN_DURATION = 30_000;

fastify.get('/getUsers', async (request, reply) => {
    const resp = await fetch('http://event.com/getUsers');
    const data = await resp.json();
    reply.send(data); 
});

fastify.post('/addEvent', async (request, reply) => {
  const now = Date.now();
  
  if(isServiceBlocked){
    if(now - serviceBlockedTime < COOLDOWN_DURATION){
      log.warn('Service blocked - within cooldown duration', {
        'Cool down Time': now - serviceBlockedTime,
        'Cool down Duration': COOLDOWN_DURATION
      });
      const elapsedTime = now - serviceBlockedTime;
      const waitTime = Math.ceil((COOLDOWN_DURATION - elapsedTime) / 1000);
      return reply.status(503).send({
        error: `Event service is temporaily unavailable. Please try again later after ${waitTime} seconds.`
      });
    } else {
      log.info('Service blocked - cooldown time completed, attempting Api call', {
        'Cool down Time': now - serviceBlockedTime,
        'Cool down Duration': COOLDOWN_DURATION
      });
      isServiceBlocked = false;
      errorCount = 0;
      initialErrorTime = null;
      isServiceAvailable = true;
    }
  }

  try {
    const resp = await fetch('http://event.com/addEvent', {
      method: 'POST', 
      body: JSON.stringify({
        id: new Date().getTime(),
        ...request.body
      })
    });

    if(!resp.ok) {
      throw new Error("External Service Error")
    }

    if(isServiceAvailable) {
      isServiceAvailable = false;
    }

    const data = await resp.json();

    errorCount = 0;
    initialErrorTime = null;
    
    if (resp.ok) {
      successCount++;
      log.debug('Event added successfully', {
        'Success Count': successCount,
        'Error Count':errorCount,
        'Initial Error Times':initialErrorTime
      });
    }
    reply.send(data);
  } catch(err) {
    if(isServiceAvailable) {
      isServiceBlocked = true;
      serviceBlockedTime = now;
      isServiceAvailable= false
      log.info('Service Still Unavailable after 30 Seconds Wait')
      return reply.status(503).send({
        error: 'Service is still unavailable'
      })
      
    }

    if (!initialErrorTime) {
      initialErrorTime = now;
      log.info('First error in window detected', {
        initialErrorTime: new Date(initialErrorTime).toISOString()
      });
    }

    errorCount++;
    log.debug('Error count incremented', { errorCount });

    if(errorCount >= SERVICE_BLOCKED_THRESHOLD &&
      now - initialErrorTime <= SERVICE_BLOCKED_DURATION
    ) {
      log.warn('Service blocking for 30 seconds', {
        'Error Count':errorCount,
        'Threshold': SERVICE_BLOCKED_THRESHOLD,
        'Time Window': now - initialErrorTime,
        'Block Duration': SERVICE_BLOCKED_DURATION
      });
      isServiceBlocked = true;
      serviceBlockedTime = now
    }
    log.error('Failed to add event', err);

    reply.status(503).send({
      error: "Failed to add event. External Service Unavailable"
    });
  }
});

fastify.get('/getEvents', async (request, reply) => {  
    const resp = await fetch('http://event.com/getEvents');
    const data = await resp.json();
    reply.send(data);
});

fastify.get('/getEventsByUserId/:id', async (request, reply) => {
    const { id } = request.params;
    // const user = await fetch('http://event.com/getUserById/' + id);
    // const userData = await user.json();
    // const userEvents = userData.events;
    // const eventArray = [];
    
    // for(let i = 0; i < userEvents.length; i++) {
    //     const event = await fetch('http://event.com/getEventById/' + userEvents[i]);
    //     const eventData = await event.json();
    //     eventArray.push(eventData);
    // }
    const events = await fetch('http://event.com/getEvents');
    const allEvents = await events.json();
 
    const eventByID = allEvents.filter(
     event => String(event.userId) === String(id)
    );
 
     reply.send(eventByID);
});

fastify.listen({ port: 3000 }, (err) => {
    listenMock();
    if (err) {
      fastify.log.error(err);
      process.exit();
    }
});
