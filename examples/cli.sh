#!/bin/bash
HR1=
HR2=
while read LINE
do
  echo "$LINE" | jq .
  curl -s -d "$LINE" -H "Content-Type: application/json" https://horihiro-node-red.mybluemix.net/livedata > /dev/null
done < <(fitbit-livedata -u ${USERNAME} -p ${PASSWORD})
