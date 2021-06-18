//-------------------------------------------------------------------

#ifndef BPMMonitorSM_H
#define BPMMonitorSM_H

//-------------------------------------------------------------------

#include <vector>
#include <Wire.h>
#include <time.h>
#include "MAX30105.h"

//-------------------------------------------------------------------

using namespace std;

//-------------------------------------------------------------------


class BPMMonitorSM {
   enum State { S_Init, S_EmptyQ, S_ReadSensor, S_Report, S_Wait, S_Check};
   
   struct read
   {
      float bpm;
      float o2;
      int timeCur;
   };

private:
   State state;
   int tick;

   float avgBPM = 0.0;
   float avgo2 = 0.0;
   int8_t counter = 0;
  
   //Time is mapped out with increments of 1min, ranges from 0-1439, 0=12AM UTC
   int16_t startInterval = 780; //default 6AM MT is 1PM UTC (780)
   int16_t endInterval = 300;////default 10PM MT is 5AM UTC
   int ledTimeout = 0;
   int nextReading = 0;
 

   int16_t frequencyTime = 30; //min
   
   MAX30105& heartSensor;

   vector<read> publishThese;
    
public:
   BPMMonitorSM(MAX30105& mySensor);  
   void execute();

   void resetState(){
      state = S_Init;
   }

   void checktheReadings();

   //Just setters and getters
   int getstartInterval(){
      return startInterval;
   }
   void setstartInterval(int newStartVal){
      startInterval = newStartVal;
   }
   int getendInterval(){
      return endInterval;
   }
   void setendInterval(int newEndVal){
      endInterval = newEndVal;
   }
   int getnextReading(){
      return nextReading;
   }
   void setnextReading(int newNextReading){
      nextReading = newNextReading;
   }
   int getfrequencyTime(){
      return frequencyTime;
   }
   void setfrequencyTime(int newFrequencyTime){
      frequencyTime = newFrequencyTime;
   }
};

//-------------------------------------------------------------------

#endif
