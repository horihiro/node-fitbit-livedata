#!/bin/bash
HR1=
HR2=
while read LINE
do
  echo "$LINE" | jq .
  # $LINE is JSON string of live data
done < <(fitbit-livedata -u ${USERNAME} -p ${PASSWORD})
