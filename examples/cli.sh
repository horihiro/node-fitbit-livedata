#!/bin/bash
HR1=
HR2=
while read LINE
do
  HR2=$(echo "$LINE" | jq -r ".heartRate")
  if [ -z "${HR1}" ]; then 
    printf "${HR2}"
  elif [ "$(expr ${HR1} = ${HR2})" = 1 ]; then
    printf "\b\b${HR2}"
  elif [ "$(expr ${HR1} \< ${HR2})" = 1 ]; then
    printf "\b\b\e[31m${HR2}\e[m"
  elif [ "$(expr ${HR1} \> ${HR2})" = 1 ]; then
    printf "\b\b\e[34m${HR2}\e[m"
  fi
  HR1=${HR2}
done < <(fitbit-livedata -u ${USERNAME} -p ${PASSWORD})
