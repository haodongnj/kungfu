```bash
cd cmake-build-debug 
conan install ../conanfile.py
cmake -DSPDLOG_LOG_LEVEL_COMPILE=trace -DCMAKE_BUILD_TYPE=Debug ..
cmake --build . --target kungfu_cache -j4
cmake --build . --target kungfu_optim -j4
cmake --build . --target kungfu -j4
```