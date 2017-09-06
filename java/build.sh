dir="$(dirname $0)"
mkdir ${dir}/dist > /dev/null 2>/dev/null
javac -Xlint:unchecked -d ${dir}/dist -cp "${dir}/../bin/core-1.56.0.0.jar" ${dir}/src/Main.java ${dir}/src/TrackerAuthCredentials.java
cd ${dir}/dist > /dev/null
jar cvf encrypt.jar *.class
cd - > /dev/null
